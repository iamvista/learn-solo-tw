// lib/auth.config.ts
// Edge-compatible auth configuration
// 用於 Middleware，不包含 Prisma adapter（Edge Runtime 不支援）

import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Apple from 'next-auth/providers/apple'
import Credentials from 'next-auth/providers/credentials'

/**
 * NextAuth 基本配置
 * 此配置不包含 adapter，適用於 Edge Runtime（Middleware）
 */
export const authConfig: NextAuthConfig = {
  // 登入頁面路徑
  pages: {
    signIn: '/login',
    error: '/login',
  },

  // Session 策略使用 JWT（Edge Runtime 相容）
  session: {
    strategy: 'jwt',
  },

  // 認證提供者（OAuth providers 僅在環境變數設定時啟用）
  providers: [
    // Google OAuth 登入
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),

    // Apple OAuth 登入
    ...(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET
      ? [
          Apple({
            clientId: process.env.AUTH_APPLE_ID,
            clientSecret: process.env.AUTH_APPLE_SECRET,
          }),
        ]
      : []),

    // Email + Password 登入
    // 注意：實際密碼驗證邏輯在 lib/auth.ts 中實作
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: '電子郵件', type: 'email' },
        password: { label: '密碼', type: 'password' },
      },
      // authorize 函數將在 lib/auth.ts 中覆寫
      authorize: async () => null,
    }),
  ],

  // Callbacks
  callbacks: {
    /**
     * JWT callback
     * 在 JWT 中加入 user.id 和 user.role
     */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = user.role
      }
      return token
    },

    /**
     * Session callback
     * 在 session.user 中加入 id 和 role
     */
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },

    /**
     * authorized callback
     * 用於 Middleware 檢查用戶是否有權限存取特定路由
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnAdmin = nextUrl.pathname.startsWith('/admin')

      // 初始化頁面只要求登入，不檢查角色
      if (nextUrl.pathname === '/admin/setup') {
        return isLoggedIn
      }

      if (isOnAdmin) {
        if (!isLoggedIn) return false

        // 檢查用戶角色是否為 ADMIN 或 EDITOR
        const userRole = auth?.user?.role
        if (userRole !== 'ADMIN' && userRole !== 'EDITOR') {
          // 權限不足，導向初始化頁面（由 setup page 判斷是否需要初始化或導回首頁）
          return Response.redirect(new URL('/admin/setup', nextUrl))
        }

        return true
      }

      return true
    },
  },
}
