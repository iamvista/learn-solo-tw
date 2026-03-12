// lib/email-templates.ts
// Email 蝭
// 鞈潸玨?????蝣潮?閮剔? HTML 蝭

import { getAppUrl } from '@/lib/app-url'

const appUrl = getAppUrl()

export interface EmailBranding {
  siteName: string
  siteLogo: string
}

function getEmailBranding(branding?: Partial<EmailBranding>): EmailBranding {
  return {
    siteName: branding?.siteName || '自由人學院',
    siteLogo: branding?.siteLogo || `${appUrl}/icon.png`,
  }
}

/**
 * ?梁 Email 璅??
 */
const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: #333;
`

const containerStyles = `
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
  background-color: #ffffff;
`

const headerStyles = `
  text-align: center;
  padding-bottom: 30px;
  border-bottom: 1px solid #eee;
  margin-bottom: 30px;
`

function getLogoHtml(branding?: Partial<EmailBranding>): string {
  const resolved = getEmailBranding(branding)
  return `<img src="${resolved.siteLogo}" alt="${resolved.siteName}" width="50" height="50" style="border-radius: 12px; margin-bottom: 10px; display: inline-block;" />`
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
`

const footerStyles = `
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid #eee;
  margin-top: 30px;
  color: #666;
  font-size: 14px;
`

const infoBoxStyles = `
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
`

/**
 * 鞈潸玨???蝭
 */
export interface PurchaseConfirmationData {
  userName: string
  courseName: string
  orderNo: string
  amount: number
}

export function purchaseConfirmationTemplate(
  data: PurchaseConfirmationData,
  branding?: Partial<EmailBranding>
): string {
  const resolved = getEmailBranding(branding)
  const logoHtml = getLogoHtml(branding)
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>鞈潸玨??</title>
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
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 28px;">鞈潸玨??嚗?/h2>
          <p style="color: #666; font-size: 16px; margin: 0 0 30px 0;">
            閬芣???${data.userName}嚗?雓???
          </p>
        </div>

        <!-- Order Info -->
        <div style="${infoBoxStyles}">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">隤脩??迂</td>
              <td style="padding: 8px 0; color: #333; font-weight: 600; text-align: right;">${data.courseName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">閮蝺刻?</td>
              <td style="padding: 8px 0; color: #333; text-align: right; font-family: monospace;">${data.orderNo}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">隞狡??</td>
              <td style="padding: 8px 0; color: #3b82f6; font-weight: 600; text-align: right;">NT$ ${data.amount.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center;">
          <p style="color: #666; font-size: 16px; margin: 0 0 10px 0;">
            ?函?典隞仿?憪飛蝧?嚗?          </p>
          <a href="${appUrl}/courses" style="${buttonStyles}">
            ??摮貊?
          </a>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            憒?隞颱???嚗??舐鼠??摰Ｘ???
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${resolved.siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * 撖Ⅳ?身蝭
 */
export interface PasswordResetData {
  userName: string
  resetUrl: string
}

export function passwordResetTemplate(
  data: PasswordResetData,
  branding?: Partial<EmailBranding>
): string {
  const resolved = getEmailBranding(branding)
  const logoHtml = getLogoHtml(branding)
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>撖Ⅳ?身</title>
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
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 28px;">撖Ⅳ?身隢?</h2>
          <p style="color: #666; font-size: 16px; margin: 0 0 20px 0;">
            閬芣???${data.userName}嚗?          </p>
          <p style="color: #666; font-size: 16px; margin: 0 0 30px 0;">
            ??唬??函?撖Ⅳ?身隢???br>
            隢????寞????身?函?撖Ⅳ??          </p>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center;">
          <a href="${data.resetUrl}" style="${buttonStyles}">
            ?身撖Ⅳ
          </a>
        </div>

        <!-- Warning -->
        <div style="${infoBoxStyles} background-color: #fff7ed; border-left: 4px solid #f97316;">
          <p style="color: #9a3412; font-size: 14px; margin: 0;">
            <strong>瘜冽?嚗?/strong>甇日??撠 24 撠?敺仃??br>
            憒??冽???瘙?閮剖?蝣潘?隢蕭?交迨?萎辣??          </p>
        </div>

        <!-- Alternative Link -->
        <div style="margin-top: 20px;">
          <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
            憒????⊥?暺?嚗?銴ˊ隞乩?????啁汗?剁?
          </p>
          <p style="color: #3b82f6; font-size: 12px; word-break: break-all; margin: 0;">
            ${data.resetUrl}
          </p>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            憒?隞颱???嚗??舐鼠??摰Ｘ???
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${resolved.siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

export interface GuestActivationData {
  userName: string
  activationUrl: string
}

export function guestActivationTemplate(
  data: GuestActivationData,
  branding?: Partial<EmailBranding>
): string {
  const resolved = getEmailBranding(branding)
  const logoHtml = getLogoHtml(branding)
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>??函?隤脩?撣唾?</title>
    </head>
    <body style="${baseStyles} background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="${containerStyles}">
        <div style="${headerStyles}">
          ${logoHtml}
          <h1 style="color: #333; margin: 10px 0 0 0; font-size: 24px;">${resolved.siteName}</h1>
        </div>

        <div style="text-align: center;">
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 28px;">?敺?甇伐???函?撣唾?</h2>
          <p style="color: #666; font-size: 16px; margin: 0 0 20px 0;">
            ${data.userName} ?典末嚗歇?嗅?函?隞狡??          </p>
          <p style="color: #666; font-size: 16px; margin: 0 0 30px 0;">
            隢?閮剖?撖Ⅳ摰?撣唾??嚗?舫?憪飛蝧玨蝔?          </p>
        </div>

        <div style="text-align: center;">
          <a href="${data.activationUrl}" style="${buttonStyles}">
            蝡?撣唾?
          </a>
        </div>

        <div style="${infoBoxStyles} background-color: #fff7ed; border-left: 4px solid #f97316;">
          <p style="color: #9a3412; font-size: 14px; margin: 0;">
            <strong>??嚗?/strong>甇日?? 24 撠??扳???銝??賭蝙?其?甈～?          </p>
        </div>

        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            憒?隞颱???嚗???甇支縑隞嗆??舐鼠摰Ｘ?
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${resolved.siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * 皜祈岫 Email 蝭
 */
export function testEmailTemplate(branding?: Partial<EmailBranding>): string {
  const resolved = getEmailBranding(branding)
  const logoHtml = getLogoHtml(branding)
  const timestamp = new Date().toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email 皜祈岫</title>
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
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 28px;">Email 閮剖?皜祈岫??嚗?/h2>
          <p style="color: #666; font-size: 16px; margin: 0 0 30px 0;">
            ?剖?嚗??Email ??撌脫迤蝣箄身摰?          </p>
        </div>

        <!-- Info -->
        <div style="${infoBoxStyles}">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">?潮???/td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${timestamp}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Email ??</td>
              <td style="padding: 8px 0; color: #333; text-align: right;">Resend</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">???/td>
              <td style="padding: 8px 0; color: #22c55e; font-weight: 600; text-align: right;">甇?虜??</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            ?銝撠葫閰阡隞?          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${resolved.siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * ?汗?函???蝭
 */
/**
 * 管理員購買通知 Email 資料
 */
export interface AdminPurchaseNotificationData {
  studentName: string
  studentEmail: string
  courseName: string
  orderNo: string
  amount: number
  paidAt: Date
}

export function adminPurchaseNotificationTemplate(
  data: AdminPurchaseNotificationData,
  branding?: Partial<EmailBranding>
): string {
  const resolved = getEmailBranding(branding)
  const logoHtml = getLogoHtml(branding)
  const paidAtStr = data.paidAt.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

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
  `
}

export const emailTemplateDescriptions = {
  purchase: {
    name: '鞈潸玨???',
    description: '?嗥?嗆??頃鞎瑁玨蝔??潮???萎辣',
    variables: ['userName', 'courseName', 'orderNo', 'amount'],
  },
  passwordReset: {
    name: '撖Ⅳ?身',
    description: '?嗥?嗉?瘙?閮剖?蝣潭??潮??萎辣',
    variables: ['userName', 'resetUrl'],
  },
  guestActivation: {
    name: '撣唾??',
    description: '???∟頃鞎瑕?嚗?身摰?蝣澆??典董???',
    variables: ['userName', 'activationUrl'],
  },
  test: {
    name: '皜祈岫?萎辣',
    description: '?冽皜祈岫 Email ???臬甇?虜??',
    variables: [],
  },
}

