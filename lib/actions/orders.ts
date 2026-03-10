// lib/actions/orders.ts
// 訂單管理 Server Actions
// 提供訂單查詢、退款、統計、匯出等功能

'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/require-admin'
import {
  orderSearchSchema,
  refundSchema,
  exportCsvSchema,
  type OrderSearchInput,
  type RefundData,
  type ExportCsvData,
} from '@/lib/validations/order'
import type { OrderStatus, PaymentMethod, Prisma } from '@prisma/client'
import { getGatewayByType } from '@/lib/payment/gateway-factory'
import type { PaymentGatewayType } from '@/lib/payment/types'

/**
 * 訂單資料（含用戶和課程資訊）
 */
export interface OrderWithDetails {
  id: string
  orderNo: string
  userId: string
  courseId: string
  amount: number
  originalAmount: number
  status: OrderStatus
  paymentMethod: PaymentMethod | null
  stripeSessionId: string | null
  stripePaymentIntentId: string | null
  stripeResponse: Prisma.JsonValue | null
  paidAt: Date | null
  refundedAt: Date | null
  refundReason: string | null
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
  course: {
    id: string
    title: string
    coverImage: string | null
  } | null
}

/**
 * 訂單列表回傳結果
 */
export interface GetOrdersResult {
  orders: OrderWithDetails[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 訂單統計
 */
export interface OrderStats {
  totalOrders: number
  totalRevenue: number
  paidOrders: number
  pendingOrders: number
  refundedOrders: number
  failedOrders: number
}

// requireAdminAuth 從 @/lib/require-admin 引入（直接查 DB 確保角色即時生效）

/**
 * 記錄管理員操作日誌
 */
async function logAdminAction(
  adminId: string,
  action: 'PROCESS_REFUND',
  targetId: string,
  details?: Record<string, unknown>
) {
  try {
    await prisma.adminLog.create({
      data: {
        adminId,
        action,
        targetType: 'Order',
        targetId,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      },
    })
  } catch (error) {
    console.error('記錄操作日誌失敗:', error)
  }
}

/**
 * 取得訂單列表
 */
export async function getOrders(
  params: OrderSearchInput = {}
): Promise<GetOrdersResult> {
  await requireAdminAuth()

  // 驗證參數
  const validatedParams = orderSearchSchema.parse(params)
  const {
    search,
    status,
    paymentMethod,
    startDate,
    endDate,
    page,
    pageSize,
  } = validatedParams

  // 建立查詢條件
  const where: Prisma.OrderWhereInput = {}

  // 搜尋訂單編號、Stripe ID、學員 Email、課程名稱
  if (search) {
    const [matchingUsers, matchingCourses] = await Promise.all([
      prisma.user.findMany({
        where: { email: { contains: search, mode: 'insensitive' } },
        select: { id: true },
      }),
      prisma.course.findMany({
        where: { title: { contains: search, mode: 'insensitive' } },
        select: { id: true },
      }),
    ])

    where.OR = [
      { orderNo: { contains: search, mode: 'insensitive' } },
      { stripeSessionId: { contains: search, mode: 'insensitive' } },
      ...(matchingUsers.length > 0
        ? [{ userId: { in: matchingUsers.map((u) => u.id) } }]
        : []),
      ...(matchingCourses.length > 0
        ? [{ courseId: { in: matchingCourses.map((c) => c.id) } }]
        : []),
    ]
  }

  // 狀態篩選
  if (status) {
    where.status = status
  }

  // 付款方式篩選
  if (paymentMethod) {
    where.paymentMethod = paymentMethod
  }

  // 日期範圍篩選
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      where.createdAt.gte = new Date(startDate)
    }
    if (endDate) {
      // 設定為該日的結束時間
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      where.createdAt.lte = end
    }
  }

  // 查詢總數
  const total = await prisma.order.count({ where })

  // 查詢訂單列表
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  // 取得用戶和課程資訊
  const userIds = [...new Set(orders.map((o) => o.userId))]
  const courseIds = [...new Set(orders.map((o) => o.courseId))]

  const [users, courses] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, image: true },
    }),
    prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true, coverImage: true },
    }),
  ])

  const userMap = new Map(users.map((u) => [u.id, u]))
  const courseMap = new Map(courses.map((c) => [c.id, c]))

  // 組合結果
  const ordersWithDetails: OrderWithDetails[] = orders.map((order) => ({
    ...order,
    user: userMap.get(order.userId) || null,
    course: courseMap.get(order.courseId) || null,
  }))

  return {
    orders: ordersWithDetails,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * 取得單一訂單詳情
 */
export async function getOrderById(id: string): Promise<OrderWithDetails | null> {
  await requireAdminAuth()

  const order = await prisma.order.findUnique({
    where: { id },
  })

  if (!order) {
    return null
  }

  // 取得用戶和課程資訊
  const [user, course] = await Promise.all([
    prisma.user.findUnique({
      where: { id: order.userId },
      select: { id: true, name: true, email: true, image: true },
    }),
    prisma.course.findUnique({
      where: { id: order.courseId },
      select: { id: true, title: true, coverImage: true },
    }),
  ])

  return {
    ...order,
    user,
    course,
  }
}

/**
 * 標記訂單為已退款
 */
export async function markAsRefunded(
  data: RefundData
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireAdminAuth()

    // 驗證資料
    const validatedData = refundSchema.parse(data)

    // 查詢訂單
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
    })

    if (!order) {
      return { success: false, error: '訂單不存在' }
    }

    // 檢查訂單狀態
    if (order.status !== 'PAID') {
      return { success: false, error: '只有已付款的訂單可以退款' }
    }

    // 透過金流閘道發起退款
    const gatewayType = (order.paymentGateway as PaymentGatewayType) || 'stripe'
    try {
      const gateway = await getGatewayByType(gatewayType)
      const refundResult = await gateway.processRefund({
        gatewayPaymentId: order.stripePaymentIntentId,
      })
      if (!refundResult.success && refundResult.error) {
        return { success: false, error: refundResult.error }
      }
    } catch (refundError) {
      console.error('金流退款失敗:', refundError)
      // PAYUNi 無退款 API，繼續標記為退款；Stripe 則回報錯誤
      if (gatewayType === 'stripe') {
        return {
          success: false,
          error: `退款失敗: ${refundError instanceof Error ? refundError.message : '未知錯誤'}`,
        }
      }
    }

    // 以 transaction 確保訂單狀態更新與購買撤銷的原子性
    await prisma.$transaction(async (tx) => {
      // 更新訂單狀態
      await tx.order.update({
        where: { id: validatedData.orderId },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
          refundReason: validatedData.reason,
        },
      })

      // 撤銷購買記錄
      await tx.purchase.updateMany({
        where: {
          orderId: validatedData.orderId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      })
    })

    // 記錄操作日誌
    await logAdminAction(
      currentUser.id as string,
      'PROCESS_REFUND',
      validatedData.orderId,
      {
        orderNo: order.orderNo,
        amount: order.amount,
        reason: validatedData.reason,
      }
    )

    // 重新驗證頁面快取
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${validatedData.orderId}`)

    return { success: true }
  } catch (error) {
    console.error('標記退款失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '處理退款時發生錯誤' }
  }
}

/**
 * 取得訂單統計
 */
export async function getOrderStats(): Promise<OrderStats> {
  await requireAdminAuth()

  // 並行查詢各項統計
  const [
    totalOrders,
    paidOrders,
    pendingOrders,
    refundedOrders,
    failedOrders,
    revenueResult,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PAID' } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: 'REFUNDED' } }),
    prisma.order.count({ where: { status: 'FAILED' } }),
    prisma.order.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
    }),
  ])

  return {
    totalOrders,
    totalRevenue: revenueResult._sum.amount || 0,
    paidOrders,
    pendingOrders,
    refundedOrders,
    failedOrders,
  }
}

/**
 * 匯出訂單 CSV
 */
export async function exportOrdersCsv(
  params: ExportCsvData = {}
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    await requireAdminAuth()

    // 驗證參數
    const validatedParams = exportCsvSchema.parse(params)
    const { search, status, paymentMethod, startDate, endDate } = validatedParams

    // 建立查詢條件
    const where: Prisma.OrderWhereInput = {}

    if (search) {
      const [matchingUsers, matchingCourses] = await Promise.all([
        prisma.user.findMany({
          where: { email: { contains: search, mode: 'insensitive' } },
          select: { id: true },
        }),
        prisma.course.findMany({
          where: { title: { contains: search, mode: 'insensitive' } },
          select: { id: true },
        }),
      ])

      where.OR = [
        { orderNo: { contains: search, mode: 'insensitive' } },
        { stripeSessionId: { contains: search, mode: 'insensitive' } },
        ...(matchingUsers.length > 0
          ? [{ userId: { in: matchingUsers.map((u) => u.id) } }]
          : []),
        ...(matchingCourses.length > 0
          ? [{ courseId: { in: matchingCourses.map((c) => c.id) } }]
          : []),
      ]
    }

    if (status) {
      where.status = status
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    // 查詢訂單
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // 取得用戶和課程資訊
    const userIds = [...new Set(orders.map((o) => o.userId))]
    const courseIds = [...new Set(orders.map((o) => o.courseId))]

    const [users, courses] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      }),
      prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true, title: true },
      }),
    ])

    const userMap = new Map(users.map((u) => [u.id, u]))
    const courseMap = new Map(courses.map((c) => [c.id, c]))

    // 狀態對應
    const statusMap: Record<OrderStatus, string> = {
      PENDING: '待付款',
      PAID: '已付款',
      FAILED: '付款失敗',
      REFUNDED: '已退款',
      CANCELLED: '已取消',
    }

    // 付款方式對應
    const paymentMethodMap: Record<PaymentMethod, string> = {
      CREDIT_CARD: '信用卡',
      APPLE_PAY: 'Apple Pay',
      GOOGLE_PAY: 'Google Pay',
      ATM: 'ATM 轉帳',
      CVS: '超商代碼',
    }

    // 產生 CSV 內容
    const headers = [
      '訂單編號',
      '學員姓名',
      '學員 Email',
      '課程名稱',
      '原價',
      '實付金額',
      '付款方式',
      '狀態',
      'Stripe Session ID',
      'Stripe Payment Intent ID',
      '建立時間',
      '付款時間',
      '退款時間',
      '退款原因',
    ]

    const rows = orders.map((order) => {
      const user = userMap.get(order.userId)
      const course = courseMap.get(order.courseId)

      return [
        order.orderNo,
        user?.name || '未知',
        user?.email || '未知',
        course?.title || '未知',
        order.originalAmount.toString(),
        order.amount.toString(),
        order.paymentMethod ? paymentMethodMap[order.paymentMethod] : '未知',
        statusMap[order.status],
        order.stripeSessionId || '',
        order.stripePaymentIntentId || '',
        order.createdAt.toISOString(),
        order.paidAt?.toISOString() || '',
        order.refundedAt?.toISOString() || '',
        order.refundReason || '',
      ]
    })

    // 組合 CSV（加入 BOM 以支援 Excel 中文）
    const BOM = '\uFEFF'
    const csv =
      BOM +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n')

    return { success: true, data: csv }
  } catch (error) {
    console.error('匯出 CSV 失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '匯出 CSV 時發生錯誤' }
  }
}
