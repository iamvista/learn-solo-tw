// lib/payment/payuni-crypto.ts
// PAYUNi AES-256-GCM 加解密模組
// 參考：PAYUNi PHP SDK (https://github.com/payuni/PHP_SDK)

import crypto from 'crypto'

export interface PayUniConfig {
  merchantId: string
  hashKey: string
  hashIV: string
  apiUrl: string
}

export interface PayUniFormData {
  MerID: string
  Version: string
  EncryptInfo: string
  HashInfo: string
}

export interface PayUniResponse {
  Status: string
  Message: string
  TradeNo?: string
  TradeAmt?: number
  MerTradeNo?: string
  PaymentType?: string
  [key: string]: unknown
}

export class PayUniService {
  private config: PayUniConfig
  private readonly version = '1.0'

  constructor(config: PayUniConfig) {
    if (config.hashKey.length !== 32) {
      throw new Error(
        `HashKey must be exactly 32 characters, got ${config.hashKey.length}`
      )
    }
    if (config.hashIV.length !== 16) {
      throw new Error(
        `HashIV must be exactly 16 characters, got ${config.hashIV.length}`
      )
    }

    this.config = config
  }

  /**
   * 將物件轉為 query string 格式（模擬 PHP http_build_query）
   */
  private buildQueryString(data: Record<string, unknown>): string {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    }
    return params.toString()
  }

  /**
   * AES-256-GCM 加密
   * 格式: bin2hex(base64加密資料 + ':::' + base64(tag))
   */
  encrypt(data: string): { encryptInfo: string; hashInfo: string } {
    const { hashKey, hashIV } = this.config

    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(hashKey, 'utf8'),
      Buffer.from(hashIV, 'utf8')
    )

    let encrypted = cipher.update(data, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const tag = cipher.getAuthTag()
    const tagBase64 = tag.toString('base64')

    const combined = encrypted + ':::' + tagBase64
    const encryptInfo = Buffer.from(combined, 'utf8').toString('hex')

    const hashInfo = crypto
      .createHash('sha256')
      .update(hashKey + encryptInfo + hashIV)
      .digest('hex')
      .toUpperCase()

    return { encryptInfo, hashInfo }
  }

  /**
   * AES-256-GCM 解密
   */
  decrypt(encryptInfo: string): string {
    const { hashKey, hashIV } = this.config

    const combined = Buffer.from(encryptInfo, 'hex').toString('utf8')

    const parts = combined.split(':::')
    const encrypted = parts[0] ?? ''
    const tagBase64 = parts[1] ?? ''

    if (!encrypted || !tagBase64) {
      throw new Error('Invalid encrypted data format')
    }

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(hashKey, 'utf8'),
      Buffer.from(hashIV, 'utf8')
    )

    decipher.setAuthTag(Buffer.from(tagBase64, 'base64'))

    let decrypted = decipher.update(encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * 建立表單提交資料（用於前端 POST 到 PAYUNi）
   */
  createFormData(tradeData: Record<string, unknown>): PayUniFormData {
    const fullTradeData: Record<string, unknown> = {
      MerID: this.config.merchantId,
      Timestamp: Math.floor(Date.now() / 1000),
      ...tradeData,
    }

    const queryString = this.buildQueryString(fullTradeData)
    const { encryptInfo, hashInfo } = this.encrypt(queryString)

    return {
      MerID: this.config.merchantId,
      Version: this.version,
      EncryptInfo: encryptInfo,
      HashInfo: hashInfo,
    }
  }

  /**
   * 驗證並解密回傳資料
   */
  verifyAndDecrypt(encryptInfo: string, hashInfo: string): PayUniResponse {
    const { hashKey, hashIV } = this.config

    const expectedHash = crypto
      .createHash('sha256')
      .update(hashKey + encryptInfo + hashIV)
      .digest('hex')
      .toUpperCase()

    if (expectedHash !== hashInfo.toUpperCase()) {
      throw new Error('Hash verification failed')
    }

    const decrypted = this.decrypt(encryptInfo)
    const params = new URLSearchParams(decrypted)
    const result: Record<string, string> = {}
    params.forEach((value, key) => {
      result[key] = value
    })

    return result as unknown as PayUniResponse
  }

  getApiUrl(): string {
    return this.config.apiUrl
  }

  isTradeSuccess(status: string): boolean {
    return status === 'SUCCESS'
  }
}
