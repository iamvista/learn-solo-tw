// lib/apple-auth.ts
// Apple Sign In Secret 動態生成
// 避免 APPLE_SECRET 每 6 個月過期的問題

import jwt from 'jsonwebtoken'

// 記憶體快取
let cachedSecret: string | null = null
let cachedExpiry: number = 0

// 快取有效期（300 分鐘，JWT 設定 5 小時過期，保留 10 分鐘緩衝）
const CACHE_TTL_MS = 290 * 60 * 1000

/**
 * 動態生成 Apple Client Secret
 *
 * Apple 的 client_secret 是一個 JWT，需要用私鑰簽名
 * 這個函數會在每次需要時生成新的 token，避免過期問題
 *
 * 環境變數需求：
 * - AUTH_APPLE_ID: Services ID (e.g., com.yourcompany.app.web)
 * - AUTH_APPLE_TEAM_ID: Apple Developer Team ID (10 位字元)
 * - AUTH_APPLE_KEY_ID: Private Key ID (10 位字元)
 * - AUTH_APPLE_PRIVATE_KEY: .p8 檔案內容 (包含 BEGIN/END PRIVATE KEY)
 */
export function generateAppleClientSecret(): string {
  const teamId = process.env.AUTH_APPLE_TEAM_ID
  const clientId = process.env.AUTH_APPLE_ID
  const keyId = process.env.AUTH_APPLE_KEY_ID
  const privateKey = process.env.AUTH_APPLE_PRIVATE_KEY

  // 檢查必要環境變數（未設定時回傳空字串，讓 provider 能安全初始化）
  if (!teamId || !clientId || !keyId || !privateKey) {
    return ''
  }

  // 處理私鑰格式（環境變數中的 \n 需要轉換成實際換行）
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n')

  // 生成 JWT
  const token = jwt.sign({}, formattedPrivateKey, {
    algorithm: 'ES256',
    expiresIn: '3h', // 短期有效，每次請求都會重新生成
    audience: 'https://appleid.apple.com',
    issuer: teamId,
    subject: clientId,
    keyid: keyId,
  })

  return token
}

/**
 * 取得 Apple Client Secret（帶快取）
 * 如果設定了 AUTH_APPLE_SECRET 則直接使用
 * 否則動態生成並快取
 */
export function getAppleClientSecret(): string {
  const now = Date.now()

  // 檢查快取是否有效
  if (cachedSecret && cachedExpiry > now) {
    return cachedSecret
  }

  // 動態生成並更新快取
  const secret = generateAppleClientSecret()
  if (secret) {
    cachedSecret = secret
    cachedExpiry = now + CACHE_TTL_MS
  }

  return secret
}
