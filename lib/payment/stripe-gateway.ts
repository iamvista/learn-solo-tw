// lib/payment/stripe-gateway.ts
// Stripe 金流閘道實作

import Stripe from 'stripe'
import type {
  PaymentGateway,
  CreatePaymentSessionParams,
  CreatePaymentResult,
} from './types'

export class StripeGateway implements PaymentGateway {
  readonly type = 'stripe' as const
  private stripe: Stripe
  private secretKey: string
  private webhookSecret: string

  constructor(config: { secretKey: string; webhookSecret: string }) {
    this.secretKey = config.secretKey
    this.webhookSecret = config.webhookSecret
    this.stripe = new Stripe(config.secretKey, { typescript: true })
  }

  async createPaymentSession(
    params: CreatePaymentSessionParams
  ): Promise<CreatePaymentResult> {
    const { order, course, customerEmail, baseUrl, isOnSale, userId, courseId, identityType } =
      params

    const activePriceId = isOnSale
      ? params.stripeSalePriceId
      : params.stripePriceId

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      metadata: {
        orderNo: order.orderNo,
        orderId: order.id,
        courseId,
        userId,
        identityType,
      },
      customer_email: customerEmail || undefined,
      success_url: `${baseUrl}/checkout/success?orderNo=${order.orderNo}`,
      cancel_url: `${baseUrl}/checkout/failed?orderNo=${order.orderNo}`,
      line_items: activePriceId
        ? [{ price: activePriceId, quantity: 1 }]
        : [
            {
              price_data: {
                currency: 'twd',
                product_data: {
                  name: course.title,
                  ...(course.subtitle ? { description: course.subtitle } : {}),
                },
                unit_amount: Math.round(order.amount * 100),
              },
              quantity: 1,
            },
          ],
    }

    if (!activePriceId) {
      sessionParams.currency = 'twd'
      console.warn(
        '[Stripe Gateway] 課程無預建 Price，使用 price_data 降級模式:',
        courseId
      )
    }

    const checkoutSession =
      await this.stripe.checkout.sessions.create(sessionParams)

    return {
      type: 'redirect',
      checkoutUrl: checkoutSession.url!,
      gatewaySessionId: checkoutSession.id,
    }
  }

  async processRefund(params: {
    gatewayPaymentId: string | null
  }): Promise<{ success: boolean; error?: string }> {
    if (!params.gatewayPaymentId) {
      return { success: false, error: '缺少 Stripe Payment Intent ID，無法退款' }
    }

    try {
      await this.stripe.refunds.create({
        payment_intent: params.gatewayPaymentId,
      })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: `Stripe 退款失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
      }
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const balance = await this.stripe.balance.retrieve()
      const isTestMode = this.secretKey.startsWith('sk_test_')
      const currencies = balance.available.map((b) => b.currency.toUpperCase())
      return {
        success: true,
        message: `連線成功（${isTestMode ? '測試' : '正式'}環境）。支援幣別：${currencies.join(', ')}`,
      }
    } catch (error) {
      return {
        success: false,
        message: `連線失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
      }
    }
  }

  getSettingsSummary(baseUrl: string) {
    return {
      keyHint: this.secretKey
        ? `${this.secretKey.slice(0, 7)}...${this.secretKey.slice(-4)}`
        : '',
      isTestMode: this.secretKey.startsWith('sk_test_'),
      webhookUrl: `${baseUrl}/api/webhooks/stripe`,
    }
  }

  /** 取得 Stripe 實例（供 webhook 驗證等直接使用） */
  getStripeInstance(): Stripe {
    return this.stripe
  }

  getWebhookSecret(): string {
    return this.webhookSecret
  }
}
