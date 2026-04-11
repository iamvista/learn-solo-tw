// lib/email-transport.ts
// Email 傳輸抽象層
// 支援 Resend SDK 和 Nodemailer SMTP 兩種 provider
// 優先順序：DB 設定 > 環境變數

import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { SETTING_KEYS } from '@/lib/validations/settings'

export interface EmailPayload {
  from: string
  to: string[]
  subject: string
  html: string
}

export interface EmailSendResult {
  messageId?: string
}

export interface EmailTransport {
  send(payload: EmailPayload): Promise<EmailSendResult>
}

// ── Resend Transport ──

class ResendTransport implements EmailTransport {
  private client: Resend

  constructor(apiKey: string) {
    this.client = new Resend(apiKey)
  }

  async send(payload: EmailPayload): Promise<EmailSendResult> {
    const result = await this.client.emails.send({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    })

    if (result.error) {
      throw new Error(result.error.message)
    }

    return { messageId: result.data?.id }
  }
}

// ── SMTP Transport (Nodemailer) ──

class SmtpTransport implements EmailTransport {
  private transporter: Transporter

  constructor(config: {
    host: string
    port: number
    secure: boolean
    user?: string
    pass?: string
  }) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      ...(config.user && config.pass
        ? {
            auth: {
              user: config.user,
              pass: config.pass,
            },
          }
        : {}),
    })
  }

  async send(payload: EmailPayload): Promise<EmailSendResult> {
    const info = await this.transporter.sendMail({
      from: payload.from,
      to: payload.to.join(', '),
      subject: payload.subject,
      html: payload.html,
    })

    return { messageId: info.messageId }
  }
}

// ── SMTP 設定型別 ──

interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
}

async function getResendApiKeyFromDB(): Promise<string> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEYS.RESEND_API_KEY },
      select: { value: true },
    })

    return setting?.value?.trim() || ''
  } catch {
    return ''
  }
}

function getResendApiKeyFromEnv(): string {
  return process.env.RESEND_API_KEY?.trim() || ''
}

// ── 從資料庫讀取 SMTP 設定 ──

async function getSmtpConfigFromDB(): Promise<SmtpConfig | null> {
  try {
    const keys = [
      SETTING_KEYS.SMTP_HOST,
      SETTING_KEYS.SMTP_PORT,
      SETTING_KEYS.SMTP_USER,
      SETTING_KEYS.SMTP_PASS,
      SETTING_KEYS.SMTP_SECURE,
    ]

    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: keys } },
    })

    const map = new Map(settings.map((s) => [s.key, s.value]))
    const host = map.get(SETTING_KEYS.SMTP_HOST)

    if (!host) return null

    return {
      host,
      port: parseInt(map.get(SETTING_KEYS.SMTP_PORT) || '587', 10),
      secure: map.get(SETTING_KEYS.SMTP_SECURE) === 'true',
      user: map.get(SETTING_KEYS.SMTP_USER) || '',
      pass: map.get(SETTING_KEYS.SMTP_PASS) || '',
    }
  } catch {
    return null
  }
}

// ── 從環境變數讀取 SMTP 設定 ──

function getSmtpConfigFromEnv(): SmtpConfig | null {
  const host = process.env.SMTP_HOST
  if (!host) return null

  return {
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  }
}

// ── 取得 Email Provider 偏好 ──

async function getEmailProvider(): Promise<'resend' | 'smtp'> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEYS.EMAIL_PROVIDER },
    })
    if (setting?.value === 'smtp' || setting?.value === 'resend') {
      return setting.value
    }
  } catch {
    // fallback
  }
  return 'resend'
}

// ── 主要入口：取得 Email Transport（singleton 快取） ──

let cachedTransport: EmailTransport | null = null
let cachedTransportKey: string | null = null
let cachedTransportTime = 0
const TRANSPORT_CACHE_TTL = 5 * 60 * 1000 // 5 分鐘

export async function getEmailTransport(): Promise<EmailTransport | null> {
  const provider = await getEmailProvider()

  let transport: EmailTransport | null = null
  let cacheKey = ''

  if (provider === 'smtp') {
    const smtpConfig = (await getSmtpConfigFromDB()) || getSmtpConfigFromEnv()
    if (smtpConfig?.host) {
      cacheKey = `smtp:${smtpConfig.host}:${smtpConfig.port}:${smtpConfig.user}`
      if (cachedTransport && cachedTransportKey === cacheKey && Date.now() - cachedTransportTime < TRANSPORT_CACHE_TTL) {
        return cachedTransport
      }
      transport = new SmtpTransport(smtpConfig)
    }
  }

  if (!transport) {
    const resendApiKey = (await getResendApiKeyFromDB()) || getResendApiKeyFromEnv()
    if (resendApiKey) {
      cacheKey = `resend:${resendApiKey.slice(0, 8)}`
      if (cachedTransport && cachedTransportKey === cacheKey && Date.now() - cachedTransportTime < TRANSPORT_CACHE_TTL) {
        return cachedTransport
      }
      transport = new ResendTransport(resendApiKey)
    }
  }

  // 如果 provider 是 resend 但 key 不存在，嘗試 SMTP fallback
  if (!transport && provider === 'resend') {
    const smtpConfig = (await getSmtpConfigFromDB()) || getSmtpConfigFromEnv()
    if (smtpConfig?.host) {
      cacheKey = `smtp:${smtpConfig.host}:${smtpConfig.port}:${smtpConfig.user}`
      if (cachedTransport && cachedTransportKey === cacheKey && Date.now() - cachedTransportTime < TRANSPORT_CACHE_TTL) {
        return cachedTransport
      }
      transport = new SmtpTransport(smtpConfig)
    }
  }

  cachedTransport = transport
  cachedTransportKey = cacheKey
  cachedTransportTime = Date.now()

  return transport
}

/**
 * 清除 transport 快取（設定變更時呼叫）
 */
export function clearTransportCache() {
  cachedTransport = null
  cachedTransportKey = null
  cachedTransportTime = 0
}

// ── 檢查是否有任一 Email 服務可用 ──

export async function isEmailServiceConfigured(): Promise<boolean> {
  const provider = await getEmailProvider()

  if (provider === 'smtp') {
    const smtpConfig = (await getSmtpConfigFromDB()) || getSmtpConfigFromEnv()
    if (smtpConfig?.host) return true
  }

  if ((await getResendApiKeyFromDB()) || getResendApiKeyFromEnv()) return true

  // fallback 檢查
  const smtpConfig = (await getSmtpConfigFromDB()) || getSmtpConfigFromEnv()
  return !!smtpConfig?.host
}

// ── 測試 SMTP 連線 ──

export async function testSmtpConnection(config: SmtpConfig): Promise<{
  success: boolean
  message: string
}> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      ...(config.user && config.pass
        ? { auth: { user: config.user, pass: config.pass } }
        : {}),
    })

    await transporter.verify()
    return { success: true, message: 'SMTP 連線成功' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'SMTP 連線失敗',
    }
  }
}
