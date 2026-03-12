// lib/payment/types.ts
// 金流閘道統一介面定義

/**
 * 支援的金流閘道類型
 */
export type PaymentGatewayType = 'payuni'

/**
 * 建立付款的統一結果
 */
export interface CreatePaymentResult {
  /** 'redirect' (跳轉) 或 'form_post' (透過靜態頁 POST 表單到 PAYUNi) */
  type: 'redirect' | 'form_post'
  /** 跳轉 URL */
  checkoutUrl?: string
  /** PAYUNi 用：加密後的表單資料 */
  formData?: {
    apiUrl: string
    MerID: string
    Version: string
    EncryptInfo: string
    HashInfo: string
  }
  /** Gateway 回傳的 session/trade ID（用於存入 Order） */
  gatewaySessionId?: string
  /** Gateway 回傳的 payment reference ID（用於退款等） */
  gatewayPaymentId?: string
}

/**
 * 建立付款會話的參數
 */
export interface CreatePaymentSessionParams {
  order: { id: string; orderNo: string; amount: number }
  course: { title: string; subtitle: string | null }
  customerEmail: string | null
  baseUrl: string
  identityType: 'auth' | 'guest_shell'
  userId: string
  courseId: string
  isOnSale: boolean
}

/**
 * 金流閘道統一介面
 */
export interface PaymentGateway {
  readonly type: PaymentGatewayType

  /** 建立付款會話 */
  createPaymentSession(
    params: CreatePaymentSessionParams
  ): Promise<CreatePaymentResult>

  /** 處理退款 */
  processRefund(params: {
    gatewayPaymentId: string | null
  }): Promise<{ success: boolean; error?: string }>

  /** 測試連線 */
  testConnection(): Promise<{ success: boolean; message: string }>

  /** 取得設定摘要（遮罩敏感資料） */
  getSettingsSummary(baseUrl: string): {
    keyHint: string
    isTestMode: boolean
    webhookUrl: string
  }
}

/**
 * 金流設定（存在 SiteSetting 中的格式）
 */
export interface PaymentGatewaySettings {
  gateway: PaymentGatewayType
  payuni: {
    merchantId: string
    hashKey: string
    hashIV: string
    testMode: boolean
  }
}
