// lib/actions/admin.ts
// 後臺管理 Server Actions
// 提供儀表板統計數據查詢

'use server'

import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/require-admin'

/**
 * 儀表板統計數據類型
 */
export interface DashboardStats {
  totalRevenue: number
  monthlyOrders: number
  totalUsers: number
  totalCourses: number
}

/**
 * 最近訂單類型
 */
export interface RecentOrder {
  id: string
  orderNo: string
  amount: number
  status: string
  createdAt: Date
  userName: string
  userEmail: string
  courseTitle: string
}

/**
 * 取得儀表板統計數據
 * 檢查用戶權限並回傳統計資訊
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // 驗證用戶身份（直接查 DB 確保角色即時生效）
  await requireAdminAuth()

  try {
    // 取得總營收（已付款訂單）
    const revenueResult = await prisma.order.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'PAID',
      },
    })
    const totalRevenue = revenueResult._sum.amount ?? 0

    // 取得本月訂單數（以 paidAt 為準，與 getSalesAnalytics 一致）
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthlyOrders = await prisma.order.count({
      where: {
        paidAt: {
          gte: firstDayOfMonth,
        },
        status: 'PAID',
      },
    })

    // 取得總學員數（有購買記錄的用戶）
    const totalUsers = await prisma.user.count({
      where: {
        role: 'USER',
      },
    })

    // 取得已建立課程數量（排除草稿）
    const totalCourses = await prisma.course.count({
      where: {
        status: { in: ['PUBLISHED', 'UNLISTED'] },
      },
    })

    return {
      totalRevenue,
      monthlyOrders,
      totalUsers,
      totalCourses,
    }
  } catch (error) {
    // 資料庫查詢失敗時回傳模擬數據
    console.error('取得統計數據失敗:', error)

    return {
      totalRevenue: 0,
      monthlyOrders: 0,
      totalUsers: 0,
      totalCourses: 0,
    }
  }
}

/**
 * 取得最近訂單列表
 * @param limit 取得筆數，預設 5 筆
 */
export async function getRecentOrders(limit: number = 5): Promise<RecentOrder[]> {
  // 驗證用戶身份（直接查 DB 確保角色即時生效）
  await requireAdminAuth()

  try {
    // 取得最近訂單
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (orders.length === 0) {
      return []
    }

    // 批量查詢所有相關用戶和課程，避免 N+1 查詢問題
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

    // 建立查找映射表
    const userMap = new Map(users.map((u) => [u.id, u]))
    const courseMap = new Map(courses.map((c) => [c.id, c]))

    // 組合結果
    const recentOrders: RecentOrder[] = orders.map((order) => {
      const user = userMap.get(order.userId)
      const course = courseMap.get(order.courseId)

      return {
        id: order.id,
        orderNo: order.orderNo,
        amount: order.amount,
        status: order.status,
        createdAt: order.createdAt,
        userName: user?.name ?? '未知用戶',
        userEmail: user?.email ?? '',
        courseTitle: course?.title ?? '未知課程',
      }
    })

    return recentOrders
  } catch (error) {
    console.error('取得最近訂單失敗:', error)
    return []
  }
}
