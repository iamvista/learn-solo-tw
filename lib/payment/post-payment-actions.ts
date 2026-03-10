// lib/payment/post-payment-actions.ts
// 付款成功後的共用 side effects
// 由 Stripe webhook 和 PAYUNi notify 共同呼叫

import { prisma } from '@/lib/prisma'
import { getPostHogClient } from '@/lib/posthog-server'
import { sendMetaCAPIPurchaseEvent } from '@/lib/meta-capi'
import { sendAdminPurchaseNotification } from '@/lib/email'
import { sendGuestActivationEmail } from '@/lib/guest-activation'
import { sendCourseWelcomeEmailForPaidOrder } from '@/lib/course-welcome-email-service'

interface PostPaymentOrder {
  id: string
  orderNo: string
  userId: string
  courseId: string
  amount: number
  clientIpAddress: string | null
  clientUserAgent: string | null
}

/**
 * 付款成功後執行的所有 side effects（非阻塞）
 * - PostHog 追蹤
 * - Meta CAPI Purchase 事件
 * - 管理員購買通知 Email（依課程設定）
 * - Guest 啟用信
 * - 課程歡迎信
 */
export async function executePostPaymentActions(
  order: PostPaymentOrder
): Promise<void> {
  const [user, courseInfo] = await Promise.all([
    prisma.user.findUnique({
      where: { id: order.userId },
      select: { email: true, name: true, isGuest: true },
    }),
    prisma.course.findUnique({
      where: { id: order.courseId },
      select: { title: true, slug: true, notifyAdminOnPurchase: true },
    }),
  ])

  // PostHog: 付款成功事件
  try {
    const posthog = await getPostHogClient()
    if (posthog) {
      posthog.capture({
        distinctId: order.userId,
        event: 'payment_succeeded',
        properties: {
          order_id: order.id,
          order_no: order.orderNo,
          course_id: order.courseId,
          course_title: courseInfo?.title,
          amount: order.amount,
          currency: 'TWD',
          is_guest: user?.isGuest ?? false,
          paid_at: new Date().toISOString(),
        },
      })
      // 確保事件在 serverless 環境回收前送出
      await posthog.flush()
    }
  } catch (err) {
    console.error('[PostHog] payment_succeeded 發送失敗:', err)
  }

  // Meta CAPI Purchase 事件
  sendMetaCAPIPurchaseEvent({
    orderNo: order.orderNo,
    value: order.amount,
    contentName: courseInfo?.title,
    contentId: order.courseId,
    userEmail: user?.email,
    clientIpAddress: order.clientIpAddress,
    clientUserAgent: order.clientUserAgent,
  }).catch((err) => console.error('[Meta CAPI] 背景發送失敗:', err))

  // 管理員購買通知 Email（依課程設定決定是否發送）
  if (courseInfo?.notifyAdminOnPurchase) {
    sendAdminPurchaseNotification({
      studentName: user?.name ?? '未提供',
      studentEmail: user?.email ?? '未提供',
      paidAt: new Date(),
      courseName: courseInfo?.title ?? '未知課程',
      amount: order.amount,
      orderNo: order.orderNo,
    }).catch((err) => console.error('[Admin Email] 背景發送失敗:', err))
  }

  // Guest 啟用信
  if (user?.isGuest) {
    sendGuestActivationEmail(order.userId).catch((err) =>
      console.error('[Guest Activation] 背景發送失敗:', err)
    )
  }

  // 課程歡迎信
  if (user?.email && courseInfo?.title && courseInfo?.slug) {
    sendCourseWelcomeEmailForPaidOrder({
      orderId: order.id,
      userId: order.userId,
      courseId: order.courseId,
      toEmail: user.email,
      userName: user.name,
      courseTitle: courseInfo.title,
      courseSlug: courseInfo.slug,
      paidAt: new Date(),
    }).catch((err) =>
      console.error('[Course Welcome Email] 背景發送失敗:', err)
    )
  }
}
