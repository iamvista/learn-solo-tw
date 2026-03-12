// lib/email-templates.ts
// Email 模板
// 購買確認、密碼重設等通知信 HTML 模板

import { getAppUrl } from "@/lib/app-url";

const appUrl = getAppUrl();

export interface EmailBranding {
  siteName: string;
  siteLogo: string;
}

function getEmailBranding(branding?: Partial<EmailBranding>): EmailBranding {
  return {
    siteName: branding?.siteName || "自由人學院",
    siteLogo: branding?.siteLogo || `${appUrl}/icon.png`,
  };
}

/**
 * 共用 Email 樣式
 */
const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: #333;
`;

const containerStyles = `
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
  background-color: #ffffff;
`;

const headerStyles = `
  text-align: center;
  padding-bottom: 30px;
  border-bottom: 1px solid #eee;
  margin-bottom: 30px;
`;

function getLogoHtml(branding?: Partial<EmailBranding>): string {
  const resolved = getEmailBranding(branding);
  return `<img src="${resolved.siteLogo}" alt="${resolved.siteName}" width="50" height="50" style="border-radius: 12px; margin-bottom: 10px; display: inline-block;" />`;
}

const buttonStyles = `
  display: inline-block;
  padding: 14px 28px;
  background-color: #78573c;
  color: #ffffff;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  margin: 20px 0;
`;

const footerStyles = `
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid #eee;
  margin-top: 30px;
  color: #666;
  font-size: 14px;
`;

const infoBoxStyles = `
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
`;

/**
 * 購買確認信模板
 */
export interface PurchaseConfirmationData {
  userName: string;
  courseName: string;
  orderNo: string;
  amount: number;
}

export function purchaseConfirmationTemplate(
  data: PurchaseConfirmationData,
  branding?: Partial<EmailBranding>,
): string {
  const resolved = getEmailBranding(branding);
  const logoHtml = getLogoHtml(branding);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>購買確認</title>
    </head>
    <body style="${baseStyles} background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          ${logoHtml}
          <h1 style="color: #333; margin: 10px 0 0 0; font-size: 24px;">${resolved.siteName}</h1>
        </div>

        <!-- Content -->
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">
            <span role="img" aria-label="party">&#x1F389;</span>
          </div>
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 28px;">購買確認成功！</h2>
          <p style="color: #666; font-size: 16px; margin: 0 0 30px 0;">
            親愛的 ${data.userName}，感謝您的購買！
          </p>
        </div>

        <!-- Order Info -->
        <div style="${infoBoxStyles}">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">購買課程</td>
              <td style="padding: 8px 0; color: #333; font-weight: 600; text-align: right;">${data.courseName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">訂單編號</td>
              <td style="padding: 8px 0; color: #333; text-align: right; font-family: monospace;">${data.orderNo}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">付款金額</td>
              <td style="padding: 8px 0; color: #3b82f6; font-weight: 600; text-align: right;">NT$ ${data.amount.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center;">
          <p style="color: #666; font-size: 16px; margin: 0 0 10px 0;">
            您已可以開始觀看課程！
          </p>
          <a href="${appUrl}/courses" style="${buttonStyles}">
            前往課程
          </a>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            如有任何問題，歡迎隨時<a href="mailto:iamvista@gmail.com" style="color: #C41E3A; text-decoration: none;">聯繫我們</a>。
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${resolved.siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 密碼重設模板
 */
export interface PasswordResetData {
  userName: string;
  resetUrl: string;
}

export function passwordResetTemplate(
  data: PasswordResetData,
  branding?: Partial<EmailBranding>,
): string {
  const resolved = getEmailBranding(branding);
  const logoHtml = getLogoHtml(branding);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>密碼重設</title>
    </head>
    <body style="${baseStyles} background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          ${logoHtml}
          <h1 style="color: #333; margin: 10px 0 0 0; font-size: 24px;">${resolved.siteName}</h1>
        </div>

        <!-- Content -->
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">
            <span role="img" aria-label="key">&#x1F511;</span>
          </div>
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 28px;">密碼重設請求</h2>
          <p style="color: #666; font-size: 16px; margin: 0 0 20px 0;">
            親愛的 ${data.userName}，
          </p>
          <p style="color: #666; font-size: 16px; margin: 0 0 30px 0;">
            我們收到了您的密碼重設請求。<br>
            請點擊下方按鈕來重設您的密碼。
          </p>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center;">
          <a href="${data.resetUrl}" style="${buttonStyles}">
            重設密碼
          </a>
        </div>

        <!-- Warning -->
        <div style="${infoBoxStyles} background-color: #fff7ed; border-left: 4px solid #f97316;">
          <p style="color: #9a3412; font-size: 14px; margin: 0;">
            <strong>注意：</strong>此連結將在 24 小時後失效。<br>
            如果您未曾請求重設密碼，請忽略此封信件。
          </p>
        </div>

        <!-- Alternative Link -->
        <div style="margin-top: 20px;">
          <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
            如果按鈕無法點擊，請複製以下連結到瀏覽器：
          </p>
          <p style="color: #3b82f6; font-size: 12px; word-break: break-all; margin: 0;">
            ${data.resetUrl}
          </p>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            如有任何問題，歡迎隨時<a href="mailto:iamvista@gmail.com" style="color: #C41E3A; text-decoration: none;">聯繫我們</a>。
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${resolved.siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export interface GuestActivationData {
  userName: string;
  activationUrl: string;
}

export function guestActivationTemplate(
  data: GuestActivationData,
  branding?: Partial<EmailBranding>,
): string {
  const resolved = getEmailBranding(branding);
  const logoHtml = getLogoHtml(branding);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>啟用您的課程帳號</title>
    </head>
    <body style="${baseStyles} background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="${containerStyles}">
        <div style="${headerStyles}">
          ${logoHtml}
          <h1 style="color: #333; margin: 10px 0 0 0; font-size: 24px;">${resolved.siteName}</h1>
        </div>

        <div style="text-align: center;">
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 28px;">完成購買，啟用您的帳號</h2>
          <p style="color: #666; font-size: 16px; margin: 0 0 20px 0;">
            ${data.userName} 你好！感謝您的購買！
          </p>
          <p style="color: #666; font-size: 16px; margin: 0 0 30px 0;">
            請點擊下方按鈕設定密碼並啟用帳號，即可開始觀看課程。
          </p>
        </div>

        <div style="text-align: center;">
          <a href="${data.activationUrl}" style="${buttonStyles}">
            啟用帳號
          </a>
        </div>

        <div style="${infoBoxStyles} background-color: #fff7ed; border-left: 4px solid #f97316;">
          <p style="color: #9a3412; font-size: 14px; margin: 0;">
            <strong>注意：</strong>此連結將在 24 小時後失效。如連結過期，請聯繫我們重新發送。
          </p>
        </div>

        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            如有任何問題，歡迎隨時<a href="mailto:iamvista@gmail.com" style="color: #C41E3A; text-decoration: none;">聯繫我們</a>。
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${resolved.siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 測試 Email 模板
 */
export function testEmailTemplate(branding?: Partial<EmailBranding>): string {
  const resolved = getEmailBranding(branding);
  const logoHtml = getLogoHtml(branding);
  const timestamp = new Date().toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email 測試</title>
    </head>
    <body style="${baseStyles} background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          ${logoHtml}
          <h1 style="color: #333; margin: 10px 0 0 0; font-size: 24px;">${resolved.siteName}</h1>
        </div>

        <!-- Content -->
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">
            <span role="img" aria-label="check">&#x2705;</span>
          </div>
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 28px;">Email 設定測試成功！</h2>
          <p style="color: #666; font-size: 16px; margin: 0 0 30px 0;">
            恭喜！您的 Email 設定已正確配置。
          </p>
        </div>

        <!-- Info -->
        <div style="${infoBoxStyles}">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">發送時間</td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${timestamp}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Email 服務</td>
              <td style="padding: 8px 0; color: #333; text-align: right;">Resend</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">狀態</td>
              <td style="padding: 8px 0; color: #22c55e; font-weight: 600; text-align: right;">正常運作</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            此為測試信件，Email 設定正常運作。
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${resolved.siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 管理員購買通知模板
 */
/**
 * 管理員購買通知 Email 資料
 */
export interface AdminPurchaseNotificationData {
  studentName: string;
  studentEmail: string;
  courseName: string;
  orderNo: string;
  amount: number;
  paidAt: Date;
}

export function adminPurchaseNotificationTemplate(
  data: AdminPurchaseNotificationData,
  branding?: Partial<EmailBranding>,
): string {
  const resolved = getEmailBranding(branding);
  const logoHtml = getLogoHtml(branding);
  const paidAtStr = data.paidAt.toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>新購買通知</title>
    </head>
    <body style="${baseStyles} background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          ${logoHtml}
          <h1 style="color: #333; margin: 10px 0 0 0; font-size: 24px;">${resolved.siteName}</h1>
        </div>

        <!-- Content -->
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">
            <span role="img" aria-label="money">&#x1F4B0;</span>
          </div>
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 28px;">新購買通知</h2>
          <p style="color: #666; font-size: 16px; margin: 0 0 30px 0;">
            有學員完成了課程購買！
          </p>
        </div>

        <!-- Order Info -->
        <div style="${infoBoxStyles}">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">學員名稱</td>
              <td style="padding: 8px 0; color: #333; font-weight: 600; text-align: right;">${data.studentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">學員 Email</td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${data.studentEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">購買課程</td>
              <td style="padding: 8px 0; color: #333; font-weight: 600; text-align: right;">${data.courseName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">訂單編號</td>
              <td style="padding: 8px 0; color: #333; text-align: right; font-family: monospace;">${data.orderNo}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">付款金額</td>
              <td style="padding: 8px 0; color: #3b82f6; font-weight: 600; text-align: right;">NT$ ${data.amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">付款時間</td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${paidAtStr}</td>
            </tr>
          </table>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center;">
          <a href="${appUrl}/admin/orders" style="${buttonStyles}">
            查看訂單管理
          </a>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            此為系統自動發送的管理員通知信件
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${resolved.siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 歡迎新用戶 Email 模板
 */
export interface WelcomeUserData {
  userName: string;
}

export function welcomeUserTemplate(
  data: WelcomeUserData,
  branding?: Partial<EmailBranding>,
): string {
  const resolved = getEmailBranding(branding);
  const logoHtml = getLogoHtml(branding);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>歡迎加入 ${resolved.siteName}</title>
    </head>
    <body style="${baseStyles} background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          ${logoHtml}
          <h1 style="color: #333; margin: 10px 0 0 0; font-size: 24px;">${resolved.siteName}</h1>
        </div>

        <!-- Content -->
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">
            <span role="img" aria-label="wave">&#x1F44B;</span>
          </div>
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 28px;">歡迎加入 ${resolved.siteName}！</h2>
          <p style="color: #666; font-size: 16px; margin: 0 0 10px 0;">
            嗨 ${data.userName}，
          </p>
          <p style="color: #666; font-size: 16px; margin: 0 0 30px 0;">
            感謝你的註冊！你現在可以瀏覽並購買我們的課程，開始你的學習旅程。
          </p>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center;">
          <a href="${appUrl}/courses" style="${buttonStyles}">
            探索課程
          </a>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            如有任何問題，歡迎隨時<a href="mailto:iamvista@gmail.com" style="color: #C41E3A; text-decoration: none;">聯繫我們</a>。
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${resolved.siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 管理員新用戶註冊通知 Email 模板
 */
export interface AdminSignupNotificationData {
  newUserName: string;
  newUserEmail: string;
  signupMethod: string;
  signupTime: string;
}

export function adminSignupNotificationTemplate(
  data: AdminSignupNotificationData,
  branding?: Partial<EmailBranding>,
): string {
  const resolved = getEmailBranding(branding);
  const logoHtml = getLogoHtml(branding);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>新用戶註冊通知</title>
    </head>
    <body style="${baseStyles} background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          ${logoHtml}
          <h1 style="color: #333; margin: 10px 0 0 0; font-size: 24px;">${resolved.siteName}</h1>
        </div>

        <!-- Content -->
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">
            <span role="img" aria-label="new">&#x1F195;</span>
          </div>
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 28px;">新用戶註冊通知</h2>
          <p style="color: #666; font-size: 16px; margin: 0 0 30px 0;">
            有新用戶完成了註冊！
          </p>
        </div>

        <!-- User Info -->
        <div style="${infoBoxStyles}">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">用戶名稱</td>
              <td style="padding: 8px 0; color: #333; font-weight: 600; text-align: right;">${data.newUserName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Email</td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${data.newUserEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">註冊方式</td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${data.signupMethod}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">註冊時間</td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${data.signupTime}</td>
            </tr>
          </table>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center;">
          <a href="${appUrl}/admin/users" style="${buttonStyles}">
            查看學員管理
          </a>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            此為系統自動發送的管理員通知信件
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${resolved.siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export const emailTemplateDescriptions = {
  purchase: {
    name: "購買確認信",
    description: "當學員完成課程購買時自動發送的確認信件",
    variables: ["userName", "courseName", "orderNo", "amount"],
  },
  passwordReset: {
    name: "密碼重設",
    description: "當學員請求重設密碼時自動發送的信件",
    variables: ["userName", "resetUrl"],
  },
  guestActivation: {
    name: "帳號啟用",
    description: "訪客購買課程後，設定密碼並啟用帳號的信件",
    variables: ["userName", "activationUrl"],
  },
  test: {
    name: "測試信件",
    description: "用於測試 Email 設定是否正常運作",
    variables: [],
  },
};
