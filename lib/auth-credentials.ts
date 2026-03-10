// lib/auth-credentials.ts
// OAuth Provider Credentials 讀取（純環境變數）

export interface GoogleCredentials {
  clientId: string
  clientSecret: string
  isConfigured: boolean
}

export interface AppleCredentials {
  appleId: string
  teamId: string
  keyId: string
  privateKey: string
  isConfigured: boolean
}

/**
 * 取得 Google OAuth Credentials（從環境變數）
 */
export function getGoogleCredentials(): GoogleCredentials {
  const clientId = process.env.AUTH_GOOGLE_ID || ''
  const clientSecret = process.env.AUTH_GOOGLE_SECRET || ''

  return {
    clientId,
    clientSecret,
    isConfigured: !!(clientId && clientSecret),
  }
}

/**
 * 取得 Apple OAuth Credentials（從環境變數）
 */
export function getAppleCredentials(): AppleCredentials {
  const appleId = process.env.AUTH_APPLE_ID || ''
  const teamId = process.env.AUTH_APPLE_TEAM_ID || ''
  const keyId = process.env.AUTH_APPLE_KEY_ID || ''
  const privateKey = process.env.AUTH_APPLE_PRIVATE_KEY || ''

  return {
    appleId,
    teamId,
    keyId,
    privateKey,
    isConfigured: !!(appleId && teamId && keyId && privateKey),
  }
}
