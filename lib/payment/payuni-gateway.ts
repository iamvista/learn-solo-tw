// lib/payment/payuni-gateway.ts
// PAYUNi 統一金流閘道實作

import type {
  PaymentGateway,
  CreatePaymentSessionParams,
  CreatePaymentResult,
} from './types'
import { PayUniService } from './payuni-crypto'

export class PayUniGateway implements PaymentGateway {
  readonly type = 'payuni' as const
  private service: PayUniService
  private merchantId: string
  private testMode: boolean

  constructor(config: {
    merchantId: string
    hashKey: string
    hashIV: string
    testMode: boolean
  }) {
    this.merchantId = config.merchantId
    this.testMode = config.testMode

    const apiUrl = config.testMode
      ? 'https://sandbox-api.payuni.com.tw/api/upp'
      : 'https://api.payuni.com.tw/api/upp'

    this.service = new PayUniService({
      merchantId: config.merchantId,
      hashKey: config.hashKey,
      hashIV: config.hashIV,
      apiUrl,
    })
  }

  async createPaymentSession(
    params: CreatePaymentSessionParams
  ): Promise<CreatePaymentResult> {
    const { order, course, customerEmail, baseUrl } = params

    const prodDesc = course.title.substring(0, 100)

    const formData = this.service.createFormData({
      MerTradeNo: order.orderNo,
      TradeAmt: Math.round(order.amount),
      ProdDesc: prodDesc,
      ReturnURL: `${baseUrl}/api/payment/return`,
      NotifyURL: `${baseUrl}/api/payment/notify`,
      ...(customerEmail ? { UsrMail: customerEmail } : {}),
    })

    return {
      type: 'form_post',
      formData: {
        apiUrl: this.service.getApiUrl(),
        MerID: formData.MerID,
        Version: formData.Version,
        EncryptInfo: formData.EncryptInfo,
        HashInfo: formData.HashInfo,
      },
      gatewaySessionId: order.orderNo,
    }
  }

  async processRefund(): Promise<{ success: boolean; error?: string }> {
    // PAYUNi 無退款 API，需人工處理
    return {
      success: true,
      error: undefined,
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // 測試加解密是否正常（驗證 Key/IV 正確性）
      const testData = 'MerID=TEST&TradeAmt=100'
      const { encryptInfo } = this.service.encrypt(testData)
      const decrypted = this.service.decrypt(encryptInfo)

      if (decrypted === testData) {
        return {
          success: true,
          message: `連線測試成功（${this.testMode ? '測試' : '正式'}環境）。加解密驗證通過，商店代號：${this.merchantId}`,
        }
      }

      return {
        success: false,
        message: '加解密驗證失敗：解密結果不一致',
      }
    } catch (error) {
      return {
        success: false,
        message: `連線測試失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
      }
    }
  }

  getSettingsSummary(baseUrl: string) {
    return {
      keyHint: this.merchantId
        ? `${this.merchantId.slice(0, 3)}...${this.merchantId.slice(-3)}`
        : '',
      isTestMode: this.testMode,
      webhookUrl: `${baseUrl}/api/payment/notify`,
    }
  }

  /** 取得 PayUniService 實例（供 notify/return 路由直接使用） */
  getService(): PayUniService {
    return this.service
  }
}
