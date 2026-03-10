// lib/payment/gateway-factory.ts
// 金流閘道工廠：根據 DB 設定取得當前啟用的 gateway

import { prisma } from '@/lib/prisma'
import { SETTING_KEYS } from '@/lib/validations/settings'
import type { PaymentGateway, PaymentGatewayType, PaymentGatewaySettings } from './types'
import { StripeGateway } from './stripe-gateway'
import { PayUniGateway } from './payuni-gateway'

/**
 * 從 DB 批量讀取金流相關設定（DB 優先、env fallback）
 */
export async function getPaymentGatewaySettings(): Promise<PaymentGatewaySettings> {
  const keys = [
    SETTING_KEYS.PAYMENT_GATEWAY,
    SETTING_KEYS.STRIPE_SECRET_KEY,
    SETTING_KEYS.STRIPE_WEBHOOK_SECRET,
    SETTING_KEYS.PAYUNI_MERCHANT_ID,
    SETTING_KEYS.PAYUNI_HASH_KEY,
    SETTING_KEYS.PAYUNI_HASH_IV,
    SETTING_KEYS.PAYUNI_TEST_MODE,
  ]

  const settings = await prisma.siteSetting.findMany({
    where: { key: { in: keys } },
  })

  const settingMap = new Map(settings.map((s) => [s.key, s.value]))

  return {
    gateway: (settingMap.get(SETTING_KEYS.PAYMENT_GATEWAY) as PaymentGatewayType) || 'stripe',
    stripe: {
      secretKey:
        settingMap.get(SETTING_KEYS.STRIPE_SECRET_KEY) ||
        process.env.STRIPE_SECRET_KEY ||
        '',
      webhookSecret:
        settingMap.get(SETTING_KEYS.STRIPE_WEBHOOK_SECRET) ||
        process.env.STRIPE_WEBHOOK_SECRET ||
        '',
    },
    payuni: {
      merchantId:
        settingMap.get(SETTING_KEYS.PAYUNI_MERCHANT_ID) ||
        process.env.PAYUNI_MERCHANT_ID ||
        '',
      hashKey:
        settingMap.get(SETTING_KEYS.PAYUNI_HASH_KEY) ||
        process.env.PAYUNI_HASH_KEY ||
        '',
      hashIV:
        settingMap.get(SETTING_KEYS.PAYUNI_HASH_IV) ||
        process.env.PAYUNI_HASH_IV ||
        '',
      testMode:
        settingMap.get(SETTING_KEYS.PAYUNI_TEST_MODE) !== 'false',
    },
  }
}

/**
 * 取得當前啟用的金流閘道類型
 */
export async function getActiveGatewayType(): Promise<PaymentGatewayType> {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: SETTING_KEYS.PAYMENT_GATEWAY },
  })
  return (setting?.value as PaymentGatewayType) || 'stripe'
}

/**
 * 取得當前啟用的金流閘道實例
 */
export async function getActivePaymentGateway(): Promise<PaymentGateway> {
  const settings = await getPaymentGatewaySettings()
  return createGatewayFromSettings(settings)
}

/**
 * 根據設定建立 gateway 實例
 */
export function createGatewayFromSettings(
  settings: PaymentGatewaySettings
): PaymentGateway {
  if (settings.gateway === 'payuni') {
    const { merchantId, hashKey, hashIV, testMode } = settings.payuni

    if (!merchantId || !hashKey || !hashIV) {
      throw new Error('PAYUNi 金流設定不完整，請至後台設定商店代號、Hash Key 和 Hash IV')
    }

    return new PayUniGateway({ merchantId, hashKey, hashIV, testMode })
  }

  // 預設 Stripe
  const { secretKey, webhookSecret } = settings.stripe

  if (!secretKey) {
    throw new Error('Stripe 金流設定不完整，請設定 Secret Key')
  }

  if (!webhookSecret) {
    throw new Error('Stripe 金流設定不完整，請設定 Webhook Secret')
  }

  return new StripeGateway({ secretKey, webhookSecret })
}

/**
 * 根據特定 gateway 類型取得 gateway 實例（用於處理舊訂單的 webhook）
 */
export async function getGatewayByType(
  type: PaymentGatewayType
): Promise<PaymentGateway> {
  const settings = await getPaymentGatewaySettings()
  const overridden = { ...settings, gateway: type }
  return createGatewayFromSettings(overridden)
}
