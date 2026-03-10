// app/api/webhooks/stripe/route.ts
// Stripe Webhook 處理
// 接收付款結果通知、驗證簽章、驗證金額、更新訂單狀態

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGatewayByType } from '@/lib/payment/gateway-factory'
import { StripeGateway } from '@/lib/payment/stripe-gateway'
import { executePostPaymentActions } from '@/lib/payment/post-payment-actions'
import type Stripe from 'stripe'
import type { PaymentMethod } from '@prisma/client'

/**
 * Stripe Webhook 處理
 * POST /api/webhooks/stripe
 *
 * 安全機制：
 * 1. 簽章驗證 - 確保資料來自 Stripe
 * 2. 冪等性處理 - 使用樂觀鎖防止重複處理
 */
export async function POST(request: NextRequest) {
  try {
    // 取得 Stripe gateway 實例（即使當前 active gateway 不是 Stripe，仍需處理舊訂單的 webhook）
    let stripeGateway: StripeGateway
    try {
      const gw = await getGatewayByType('stripe')
      if (!(gw instanceof StripeGateway)) {
        throw new Error('Gateway type mismatch')
      }
      stripeGateway = gw
    } catch {
      console.error('[Stripe Webhook] 無法取得 Stripe 設定')
      return NextResponse.json(
        { success: false, message: 'Stripe not configured' },
        { status: 500 }
      )
    }

    const stripeInstance = stripeGateway.getStripeInstance()
    const webhookSecret = stripeGateway.getWebhookSecret()

    // 1. 驗證簽章
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    if (!sig) {
      console.error('[Stripe Webhook] 缺少 stripe-signature header')
      return NextResponse.json(
        { success: false, message: '缺少簽章' },
        { status: 400 }
      )
    }

    let event: Stripe.Event
    try {
      event = stripeInstance.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err) {
      const message = err instanceof Error ? err.message : '簽章驗證失敗'
      console.error('[Stripe Webhook] 簽章驗證失敗:', message)
      return NextResponse.json(
        { success: false, message },
        { status: 400 }
      )
    }

    console.log('[Stripe Webhook] 收到事件:', event.type)

    const handlePaidCheckoutSession = async (session: Stripe.Checkout.Session) => {
      const orderNo = session.metadata?.orderNo

      if (!orderNo) {
        console.error('[Stripe Webhook] metadata 中缺少 orderNo')
        return NextResponse.json(
          { success: false, message: '缺少訂單編號' },
          { status: 400 }
        )
      }

      if (session.payment_status !== 'paid') {
        console.log('[Stripe Webhook] Session 尚未付款，略過授權:', {
          orderNo,
          payment_status: session.payment_status,
        })
        return NextResponse.json({ success: true, message: '尚未付款' })
      }

      const order = await prisma.order.findFirst({
        where: { orderNo },
        select: {
          id: true,
          orderNo: true,
          userId: true,
          courseId: true,
          amount: true,
          status: true,
          stripeSessionId: true,
          clientIpAddress: true,
          clientUserAgent: true,
        },
      })

      if (!order) {
        console.error('[Stripe Webhook] 訂單不存在:', orderNo)
        return NextResponse.json(
          { success: false, message: '訂單不存在' },
          { status: 404 }
        )
      }

      if (order.stripeSessionId && order.stripeSessionId !== session.id) {
        console.error('[Stripe Webhook] Session ID 不符:', {
          orderNo,
          expected: order.stripeSessionId,
          received: session.id,
        })
        return NextResponse.json(
          { success: false, message: 'Session ID 驗證失敗' },
          { status: 400 }
        )
      }

      if (order.status === 'PAID' && order.stripeSessionId === session.id) {
        console.log('[Stripe Webhook] 訂單已處理過:', order.orderNo)
        return NextResponse.json({ success: true, message: '訂單已處理' })
      }

      if (order.status !== 'PENDING') {
        console.log(
          '[Stripe Webhook] 訂單狀態已變更:',
          order.orderNo,
          order.status
        )
        return NextResponse.json({ success: true, message: '訂單狀態已變更' })
      }

      const paymentMethod = await resolveStripePaymentMethod(
        stripeInstance,
        session
      )

      const stripeAmountTotal =
        session.amount_total != null
          ? Math.round(session.amount_total / 100)
          : null

      const safeStripeResponse = {
        sessionId: session.id,
        paymentIntent: session.payment_intent,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_email,
        amountTotal: session.amount_total,
        ...(session.total_details?.amount_discount
          ? { amountDiscount: session.total_details.amount_discount }
          : {}),
      }

      try {
        await prisma.$transaction(async (tx) => {
          const updateResult = await tx.order.updateMany({
            where: {
              id: order.id,
              status: 'PENDING',
            },
            data: {
              status: 'PAID',
              paymentMethod,
              ...(stripeAmountTotal != null
                ? { amount: stripeAmountTotal }
                : {}),
              stripeSessionId: session.id,
              stripePaymentIntentId:
                typeof session.payment_intent === 'string'
                  ? session.payment_intent
                  : null,
              stripeResponse: safeStripeResponse as object,
              paidAt: new Date(),
            },
          })

          if (updateResult.count === 0) {
            console.log('[Stripe Webhook] 訂單已被其他請求處理:', order.orderNo)
            throw new Error('ORDER_ALREADY_PROCESSED')
          }

          const existingPurchase = await tx.purchase.findUnique({
            where: {
              userId_courseId: {
                userId: order.userId,
                courseId: order.courseId,
              },
            },
          })

          if (existingPurchase) {
            if (existingPurchase.revokedAt) {
              await tx.purchase.update({
                where: { id: existingPurchase.id },
                data: {
                  revokedAt: null,
                  orderId: order.id,
                },
              })
            }
          } else {
            await tx.purchase.create({
              data: {
                userId: order.userId,
                courseId: order.courseId,
                orderId: order.id,
              },
            })
          }
        })

        const actualAmount = stripeAmountTotal ?? order.amount

        console.log('[Stripe Webhook] 訂單處理完成:', orderNo, {
          originalOrderAmount: order.amount,
          stripeAmountTotal,
          actualAmount,
        })

        // 使用共用的 post-payment actions
        executePostPaymentActions({
          id: order.id,
          orderNo: order.orderNo,
          userId: order.userId,
          courseId: order.courseId,
          amount: actualAmount,
          clientIpAddress: order.clientIpAddress,
          clientUserAgent: order.clientUserAgent,
        }).catch((err) =>
          console.error('[Stripe Webhook] Post-payment actions 失敗:', err)
        )

        return NextResponse.json({ success: true, message: '訂單已授權' })
      } catch (txError) {
        if (
          txError instanceof Error &&
          txError.message === 'ORDER_ALREADY_PROCESSED'
        ) {
          return NextResponse.json({
            success: true,
            message: '訂單已被處理',
          })
        }
        throw txError
      }
    }

    // 2. 處理付款成功事件
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      return await handlePaidCheckoutSession(session)
    }

    if (event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session
      return await handlePaidCheckoutSession(session)
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session
      const orderNo = session.metadata?.orderNo

      if (orderNo) {
        try {
          await prisma.order.updateMany({
            where: {
              orderNo,
              status: 'PENDING',
            },
            data: {
              status: 'FAILED',
              stripeSessionId: session.id,
              stripePaymentIntentId:
                typeof session.payment_intent === 'string'
                  ? session.payment_intent
                  : null,
            },
          })
          console.log('[Stripe Webhook] 訂單標記為付款失敗:', orderNo)
        } catch (error) {
          console.error('[Stripe Webhook] 更新失敗訂單狀態錯誤:', orderNo, error)
        }
      } else {
        console.warn('[Stripe Webhook] async_payment_failed 缺少 orderNo:', session.id)
      }
    }

    return NextResponse.json({ success: true, message: '處理完成' })
  } catch (error) {
    console.error('[Stripe Webhook] 處理錯誤:', error)

    return NextResponse.json(
      { success: false, message: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

/**
 * 從 Stripe PaymentIntent 取得用戶實際使用的付款方式
 * session.payment_method_types 只是「允許」的方式，不代表實際使用的
 */
async function resolveStripePaymentMethod(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<PaymentMethod> {
  try {
    const piId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id

    if (!piId) return 'CREDIT_CARD'

    const paymentIntent = await stripe.paymentIntents.retrieve(piId, {
      expand: ['payment_method'],
    })

    const pm = paymentIntent.payment_method
    if (!pm || typeof pm === 'string') return 'CREDIT_CARD'

    // pm.type = 'card' 時，card.wallet 可區分 Apple Pay / Google Pay
    if (pm.type === 'card' && pm.card?.wallet) {
      const walletType = pm.card.wallet.type
      if (walletType === 'apple_pay') return 'APPLE_PAY'
      if (walletType === 'google_pay') return 'GOOGLE_PAY'
    }

    return 'CREDIT_CARD'
  } catch (err) {
    console.error('[Stripe Webhook] 取得付款方式失敗，預設為信用卡:', err)
    return 'CREDIT_CARD'
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Stripe Webhook endpoint is ready',
    timestamp: new Date().toISOString(),
  })
}
