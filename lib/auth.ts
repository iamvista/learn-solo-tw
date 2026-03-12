// lib/auth.ts
// NextAuth v5 完整配置
// 包含 PrismaAdapter 和所有認證提供者

import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { getAppleClientSecret } from "@/lib/apple-auth";
import { getPostHogClient } from "@/lib/posthog-server";
import { sendWelcomeEmail, sendAdminSignupNotification } from "@/lib/email";

/**
 * NextAuth 完整配置
 * 包含 PrismaAdapter，用於 Node.js Runtime
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  // 繼承 Edge-compatible 基本配置
  ...authConfig,

  // 使用 Prisma Adapter 連接資料庫
  // 使用類型斷言解決 @auth/core 版本衝突
  adapter: PrismaAdapter(prisma) as Adapter,

  // Session 策略
  session: {
    strategy: "jwt",
    // Session 有效期：30 天
    maxAge: 30 * 24 * 60 * 60,
  },

  // 認證提供者（OAuth providers 僅在環境變數設定時啟用）
  providers: [
    // Google OAuth 登入（僅在設定 clientId 和 clientSecret 時啟用）
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // Apple OAuth 登入（僅在設定完整 Apple 憑證時啟用）
    ...(process.env.AUTH_APPLE_ID &&
    process.env.AUTH_APPLE_TEAM_ID &&
    process.env.AUTH_APPLE_KEY_ID &&
    process.env.AUTH_APPLE_PRIVATE_KEY
      ? [
          Apple({
            clientId: process.env.AUTH_APPLE_ID,
            clientSecret: getAppleClientSecret(),
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // Email + Password 登入
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "電子郵件", type: "email" },
        password: { label: "密碼", type: "password" },
      },
      async authorize(credentials) {
        // 驗證輸入
        if (!credentials?.email || !credentials?.password) {
          throw new Error("請輸入電子郵件和密碼");
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // 查詢用戶（包含鎖定狀態）
        const user = await prisma.user.findUnique({
          where: { email },
        });

        // 用戶不存在
        if (!user) {
          throw new Error("電子郵件或密碼錯誤");
        }

        // 檢查帳號是否被鎖定
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("帳號已被暫時鎖定，請稍後再試");
        }

        // 用戶沒有設定密碼（可能是 OAuth 註冊）
        if (!user.password) {
          throw new Error("此帳號使用社群登入，請使用 Google 或 Apple 登入");
        }

        // 驗證密碼
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          throw new Error("電子郵件或密碼錯誤");
        }

        // 回傳用戶資訊
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],

  // Callbacks
  callbacks: {
    /**
     * signIn callback
     * 搭配 allowDangerousEmailAccountLinking 做安全防護：
     * - Guest 帳號允許被 OAuth 自動連結
     * - 非 guest 帳號且無此 provider 的 Account 則拒絕（防止帳號劫持）
     */
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;

      const email = user.email;
      if (!email) return true;

      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          isGuest: true,
          accounts: { select: { provider: true } },
        },
      });

      // 新用戶，無衝突
      if (!existingUser) return true;

      // Guest 帳號允許連結
      if (existingUser.isGuest) return true;

      // 非 guest 帳號：檢查是否已有此 provider 的 Account（正常的重複登入）
      const hasThisProvider = existingUser.accounts.some(
        (a) => a.provider === account?.provider,
      );
      if (hasThisProvider) return true;

      // 非 guest 帳號、無此 provider：拒絕自動連結（防止帳號劫持）
      return false;
    },

    /**
     * JWT callback
     * 在 JWT 中加入 user.id 和 user.role
     */
    async jwt({ token, user, trigger }) {
      // 首次登入時，將用戶資訊加入 token
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.roleRefreshedAt = Date.now();
      }

      // 當 session 更新時（例如用戶角色變更），從 DB 重新讀取角色
      if (trigger === "update") {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
          }
          token.roleRefreshedAt = Date.now();
        } catch {
          // DB 查詢失敗時保留現有角色
        }
      }

      // 每 5 分鐘從資料庫刷新角色，確保角色變更即時生效
      const ROLE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 分鐘
      const lastRefreshed = (token.roleRefreshedAt as number) || 0;
      if (token.id && Date.now() - lastRefreshed > ROLE_REFRESH_INTERVAL) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
          }
          token.roleRefreshedAt = Date.now();
        } catch {
          // DB 查詢失敗時保留現有角色，不中斷用戶體驗
        }
      }

      return token;
    },

    /**
     * Session callback
     * 在 session.user 中加入 id 和 role
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }

      return session;
    },
  },

  // 事件
  events: {
    /**
     * 當用戶透過 OAuth 首次登入時觸發（新用戶註冊）
     */
    async createUser({ user }) {
      console.log(`新用戶註冊: ${user.email}`);

      // PostHog: 追蹤 OAuth 註冊
      if (user.id) {
        const posthog = await getPostHogClient();
        if (posthog) {
          posthog.capture({
            distinctId: user.id,
            event: "user_registered",
            properties: {
              registration_method: "oauth",
              email: user.email,
              name: user.name,
            },
          });
          posthog.identify({
            distinctId: user.id,
            properties: {
              email: user.email,
              name: user.name,
              created_at: new Date().toISOString(),
            },
          });
          await posthog.flush();
        }
      }

      // 寄送歡迎信 + 管理員通知（非阻塞）
      if (user.email) {
        sendWelcomeEmail(user.email, { userName: user.name || "學員" }).catch(
          (err) => console.error("歡迎信發送失敗:", err),
        );

        sendAdminSignupNotification({
          newUserName: user.name || "未提供",
          newUserEmail: user.email,
          signupMethod: "Google OAuth",
          signupTime: new Date().toLocaleString("zh-TW", {
            timeZone: "Asia/Taipei",
          }),
        }).catch((err) => console.error("管理員註冊通知發送失敗:", err));
      }
    },

    /**
     * 每次用戶登入時觸發（包含 OAuth 和 Credentials）
     * Credentials 登入已在 lib/actions/auth.ts 中追蹤，此處僅追蹤 OAuth
     */
    async signIn({ user, account }) {
      if (account?.provider && account.provider !== "credentials" && user.id) {
        const posthog = await getPostHogClient();
        if (posthog) {
          posthog.capture({
            distinctId: user.id,
            event: "user_logged_in",
            properties: {
              login_method: account.provider,
              email: user.email,
            },
          });
          posthog.identify({
            distinctId: user.id,
            properties: {
              email: user.email,
            },
          });
          await posthog.flush();
        }

        // Guest 帳號透過 OAuth 登入時，自動升級為正式帳號
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { isGuest: true },
        });
        if (dbUser?.isGuest) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isGuest: false, guestActivatedAt: new Date() },
          });
          console.log(
            `[Auth] Guest 帳號已透過 ${account.provider} OAuth 升級:`,
            user.email,
          );
        }
      }
    },
  },

  // 除錯模式（僅開發環境）
  debug: process.env.NODE_ENV === "development",
});
