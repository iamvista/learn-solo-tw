// lib/email.ts
// Email 發送功能
// 使用 Resend SDK 發送各類通知郵件

import { Resend } from "resend";
import {
  purchaseConfirmationTemplate,
  passwordResetTemplate,
  guestActivationTemplate,
  testEmailTemplate,
  adminPurchaseNotificationTemplate,
  welcomeUserTemplate,
  adminSignupNotificationTemplate,
  type PurchaseConfirmationData,
  type AdminPurchaseNotificationData,
  type WelcomeUserData,
  type AdminSignupNotificationData,
  type EmailBranding,
} from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";
import { SETTING_KEYS } from "@/lib/validations/settings";
import { getAppUrl } from "@/lib/app-url";

/**
 * 取得發送者 Email（優先從資料庫讀取，fallback 到環境變數）
 */
async function getEmailFrom(): Promise<string> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEYS.EMAIL_FROM },
    });
    return setting?.value || process.env.EMAIL_FROM || "noreply@example.com";
  } catch {
    return process.env.EMAIL_FROM || "noreply@example.com";
  }
}

/**
 * 取得 Resend API Key（從環境變數讀取）
 */
function getResendApiKey(): string | null {
  return process.env.RESEND_API_KEY || null;
}

/**
 * 取得 Resend 客戶端
 * 從環境變數讀取 API Key
 */
function getResendClient(): Resend | null {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Email 發送結果
 */
interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 取得發送者名稱（從資料庫讀取）
 */
async function getSenderName(): Promise<string> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEYS.EMAIL_SENDER_NAME },
    });
    const siteName = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEYS.SITE_NAME },
    });
    return setting?.value || siteName?.value || "自由人學院";
  } catch (error) {
    console.error("取得發送者名稱失敗:", error);
    return "自由人學院";
  }
}

async function getEmailBranding(): Promise<EmailBranding> {
  try {
    const [siteName, siteLogo, contactEmail] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: SETTING_KEYS.SITE_NAME } }),
      prisma.siteSetting.findUnique({ where: { key: SETTING_KEYS.SITE_LOGO } }),
      prisma.siteSetting.findUnique({
        where: { key: SETTING_KEYS.CONTACT_EMAIL },
      }),
    ]);

    const appUrl = getAppUrl();

    return {
      siteName: siteName?.value || "自由人學院",
      siteLogo: siteLogo?.value || `${appUrl}/icon.png`,
      contactEmail: contactEmail?.value || "iamvista@gmail.com",
    };
  } catch {
    const appUrl = getAppUrl();
    return {
      siteName: "自由人學院",
      siteLogo: `${appUrl}/icon.png`,
      contactEmail: "iamvista@gmail.com",
    };
  }
}

/**
 * 發送購課成功通知
 */
export async function sendPurchaseConfirmation(
  to: string,
  data: PurchaseConfirmationData,
): Promise<SendEmailResult> {
  try {
    const resend = getResendClient();
    if (!resend) {
      return {
        success: false,
        error: "Email 服務未設定 (缺少 RESEND_API_KEY)",
      };
    }

    const [senderName, branding, emailFrom] = await Promise.all([
      getSenderName(),
      getEmailBranding(),
      getEmailFrom(),
    ]);
    const html = purchaseConfirmationTemplate(data, branding);

    const result = await resend.emails.send({
      from: `${senderName} <${emailFrom}>`,
      to: [to],
      subject: `[${senderName}] 購課成功 - ${data.courseName}`,
      html,
    });

    if (result.error) {
      console.error("發送購課通知失敗:", result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("發送購課通知失敗:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "發送失敗",
    };
  }
}

/**
 * 發送密碼重設郵件
 */
export async function sendPasswordReset(
  to: string,
  resetUrl: string,
  userName?: string,
): Promise<SendEmailResult> {
  try {
    const resend = getResendClient();
    if (!resend) {
      return {
        success: false,
        error: "Email 服務未設定 (缺少 RESEND_API_KEY)",
      };
    }

    const [senderName, branding, emailFrom] = await Promise.all([
      getSenderName(),
      getEmailBranding(),
      getEmailFrom(),
    ]);
    const html = passwordResetTemplate(
      {
        userName: userName || "用戶",
        resetUrl,
      },
      branding,
    );

    const result = await resend.emails.send({
      from: `${senderName} <${emailFrom}>`,
      to: [to],
      subject: `[${senderName}] 密碼重設請求`,
      html,
    });

    if (result.error) {
      console.error("發送密碼重設郵件失敗:", result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("發送密碼重設郵件失敗:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "發送失敗",
    };
  }
}

/**
 * 發送非會員帳號啟用信
 */
export async function sendGuestActivation(
  to: string,
  activationUrl: string,
  userName?: string,
): Promise<SendEmailResult> {
  try {
    const resend = getResendClient();
    if (!resend) {
      return {
        success: false,
        error: "Email 服務未設定 (缺少 RESEND_API_KEY)",
      };
    }

    const [senderName, branding, emailFrom] = await Promise.all([
      getSenderName(),
      getEmailBranding(),
      getEmailFrom(),
    ]);
    const html = guestActivationTemplate(
      {
        userName: userName || "學員",
        activationUrl,
      },
      branding,
    );

    const result = await resend.emails.send({
      from: `${senderName} <${emailFrom}>`,
      to: [to],
      subject: `[${senderName}] 請完成帳號啟用`,
      html,
    });

    if (result.error) {
      console.error("發送帳號啟用信失敗:", result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("發送帳號啟用信失敗:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "發送失敗",
    };
  }
}

/**
 * 發送測試 Email
 */
export async function sendTestEmail(to: string): Promise<SendEmailResult> {
  try {
    const resend = getResendClient();
    if (!resend) {
      return {
        success: false,
        error: "Email 服務未設定 (缺少 RESEND_API_KEY)",
      };
    }

    const [senderName, branding, emailFrom] = await Promise.all([
      getSenderName(),
      getEmailBranding(),
      getEmailFrom(),
    ]);
    const html = testEmailTemplate(branding);

    const result = await resend.emails.send({
      from: `${senderName} <${emailFrom}>`,
      to: [to],
      subject: `[${senderName}] Email 設定測試`,
      html,
    });

    if (result.error) {
      console.error("發送測試郵件失敗:", result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("發送測試郵件失敗:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "發送失敗",
    };
  }
}

/**
 * 發送自訂 HTML Email
 */
export async function sendCustomHtmlEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  try {
    const resend = getResendClient();
    if (!resend) {
      return {
        success: false,
        error: "Email 服務未設定 (缺少 RESEND_API_KEY)",
      };
    }

    const [senderName, emailFrom] = await Promise.all([
      getSenderName(),
      getEmailFrom(),
    ]);

    const result = await resend.emails.send({
      from: `${senderName} <${emailFrom}>`,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    });

    if (result.error) {
      console.error("發送自訂郵件失敗:", result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("發送自訂郵件失敗:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "發送失敗",
    };
  }
}

/**
 * 發送管理員購買通知 Email
 * 寄送給所有 ADMIN 角色的用戶
 */
export async function sendAdminPurchaseNotification(
  data: AdminPurchaseNotificationData,
): Promise<SendEmailResult> {
  try {
    const resend = getResendClient();
    if (!resend) {
      return {
        success: false,
        error: "Email 服務未設定 (缺少 RESEND_API_KEY)",
      };
    }

    // 查詢所有管理員的 email
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true },
    });

    const adminEmails = admins
      .map((a) => a.email)
      .filter((email): email is string => !!email);

    if (adminEmails.length === 0) {
      return {
        success: false,
        error: "找不到任何管理員 Email",
      };
    }

    const [senderName, branding, emailFrom] = await Promise.all([
      getSenderName(),
      getEmailBranding(),
      getEmailFrom(),
    ]);
    const html = adminPurchaseNotificationTemplate(data, branding);

    const result = await resend.emails.send({
      from: `${senderName} <${emailFrom}>`,
      to: adminEmails,
      subject: `[${senderName}] 新購買通知 - ${data.courseName}`,
      html,
    });

    if (result.error) {
      console.error("發送管理員購買通知失敗:", result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("發送管理員購買通知失敗:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "發送失敗",
    };
  }
}

/**
 * 發送歡迎信給新用戶
 */
export async function sendWelcomeEmail(
  to: string,
  data: WelcomeUserData,
): Promise<SendEmailResult> {
  try {
    const resend = getResendClient();
    if (!resend) {
      return {
        success: false,
        error: "Email 服務未設定 (缺少 RESEND_API_KEY)",
      };
    }

    const [senderName, branding, emailFrom] = await Promise.all([
      getSenderName(),
      getEmailBranding(),
      getEmailFrom(),
    ]);
    const html = welcomeUserTemplate(data, branding);

    const result = await resend.emails.send({
      from: `${senderName} <${emailFrom}>`,
      to: [to],
      subject: `歡迎加入 ${senderName}！`,
      html,
    });

    if (result.error) {
      console.error("發送歡迎信失敗:", result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("發送歡迎信失敗:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "發送失敗",
    };
  }
}

/**
 * 發送管理員新用戶註冊通知 Email
 * 寄送給所有 ADMIN 角色的用戶
 */
export async function sendAdminSignupNotification(
  data: AdminSignupNotificationData,
): Promise<SendEmailResult> {
  try {
    const resend = getResendClient();
    if (!resend) {
      return {
        success: false,
        error: "Email 服務未設定 (缺少 RESEND_API_KEY)",
      };
    }

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true },
    });

    const adminEmails = admins
      .map((a) => a.email)
      .filter((email): email is string => !!email);

    if (adminEmails.length === 0) {
      return {
        success: false,
        error: "找不到任何管理員 Email",
      };
    }

    const [senderName, branding, emailFrom] = await Promise.all([
      getSenderName(),
      getEmailBranding(),
      getEmailFrom(),
    ]);
    const html = adminSignupNotificationTemplate(data, branding);

    const result = await resend.emails.send({
      from: `${senderName} <${emailFrom}>`,
      to: adminEmails,
      subject: `[${senderName}] 新用戶註冊 - ${data.newUserEmail}`,
      html,
    });

    if (result.error) {
      console.error("發送管理員註冊通知失敗:", result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("發送管理員註冊通知失敗:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "發送失敗",
    };
  }
}

/**
 * 檢查 Email 服務是否已設定
 */
export function isEmailConfigured(): boolean {
  return !!getResendApiKey();
}
