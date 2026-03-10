// lib/actions/analytics.ts
// 銷售分析 Server Actions
// 提供銷售數據統計、趨勢分析、熱門課程排行等功能

'use server'

import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/require-admin'
import type { PaymentMethod } from '@prisma/client'

/**
 * 將 UTC 時間轉換為台灣時區 (UTC+8) 的日期字串 "YYYY-MM-DD"
 * 避免凌晨 0:00-8:00 的活動被歸類到前一天
 */
function toTWDateString(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

/**
 * 將 UTC 時間轉換為台灣時區的小時 key "YYYY-MM-DD HH:00"
 */
function toTWHourKey(date: Date): string {
  const d = toTWDateString(date)
  const h = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    hour12: false,
  }).format(date)
  return `${d} ${h.padStart(2, '0')}:00`
}

// requireAdminAuth 從 @/lib/require-admin 引入（直接查 DB 確保角色即時生效）

/**
 * 銷售分析總覽
 */
export interface SalesAnalytics {
  // 總營收
  totalRevenue: number
  // 總訂單數
  totalOrders: number
  // 本月營收
  thisMonthRevenue: number
  // 上月營收
  lastMonthRevenue: number
  // 月營收成長率（百分比）
  monthlyGrowth: number
  // 本月訂單數
  thisMonthOrders: number
  // 上月訂單數
  lastMonthOrders: number
  // 平均客單價
  averageOrderValue: number
}

/**
 * 每日銷售資料
 */
export interface DailySales {
  date: string
  revenue: number
  orders: number
}

/**
 * 熱門課程資料
 */
export interface TopCourse {
  courseId: string
  courseTitle: string
  coverImage: string | null
  totalRevenue: number
  totalOrders: number
}

/**
 * 付款方式統計
 */
export interface PaymentMethodStats {
  method: PaymentMethod
  label: string
  count: number
  percentage: number
}

/**
 * 取得銷售分析總覽
 */
export async function getSalesAnalytics(): Promise<SalesAnalytics> {
  await requireAdminAuth()

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  // 並行查詢各項統計
  const [
    totalResult,
    thisMonthResult,
    lastMonthResult,
    totalOrders,
    thisMonthOrders,
    lastMonthOrders,
  ] = await Promise.all([
    // 總營收
    prisma.order.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
    }),
    // 本月營收
    prisma.order.aggregate({
      where: {
        status: 'PAID',
        paidAt: { gte: thisMonthStart },
      },
      _sum: { amount: true },
    }),
    // 上月營收
    prisma.order.aggregate({
      where: {
        status: 'PAID',
        paidAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
      _sum: { amount: true },
    }),
    // 總訂單數
    prisma.order.count({ where: { status: 'PAID' } }),
    // 本月訂單數
    prisma.order.count({
      where: {
        status: 'PAID',
        paidAt: { gte: thisMonthStart },
      },
    }),
    // 上月訂單數
    prisma.order.count({
      where: {
        status: 'PAID',
        paidAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    }),
  ])

  const totalRevenue = totalResult._sum.amount || 0
  const thisMonthRevenue = thisMonthResult._sum.amount || 0
  const lastMonthRevenue = lastMonthResult._sum.amount || 0

  // 計算月成長率
  let monthlyGrowth = 0
  if (lastMonthRevenue > 0) {
    monthlyGrowth = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
  } else if (thisMonthRevenue > 0) {
    monthlyGrowth = 100
  }

  // 計算平均客單價
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  return {
    totalRevenue,
    totalOrders,
    thisMonthRevenue,
    lastMonthRevenue,
    monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
    thisMonthOrders,
    lastMonthOrders,
    averageOrderValue: Math.round(averageOrderValue),
  }
}

/**
 * 取得每日銷售數據
 */
export async function getDailySales(
  startDate: string,
  endDate: string
): Promise<DailySales[]> {
  await requireAdminAuth()

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  // 查詢期間內已付款的訂單
  const orders = await prisma.order.findMany({
    where: {
      status: 'PAID',
      paidAt: {
        gte: start,
        lte: end,
      },
    },
    select: {
      amount: true,
      paidAt: true,
    },
  })

  // 建立日期範圍內的所有日期
  const dateMap = new Map<string, { revenue: number; orders: number }>()
  const current = new Date(start)

  while (current <= end) {
    const dateStr = toTWDateString(current)
    dateMap.set(dateStr, { revenue: 0, orders: 0 })
    current.setDate(current.getDate() + 1)
  }

  // 統計每日數據（使用台灣時區）
  orders.forEach((order) => {
    if (order.paidAt) {
      const dateStr = toTWDateString(order.paidAt)
      const existing = dateMap.get(dateStr)
      if (existing) {
        existing.revenue += order.amount
        existing.orders += 1
      }
    }
  })

  // 轉換為陣列格式
  const result: DailySales[] = []
  dateMap.forEach((value, key) => {
    result.push({
      date: key,
      revenue: value.revenue,
      orders: value.orders,
    })
  })

  // 按日期排序
  result.sort((a, b) => a.date.localeCompare(b.date))

  return result
}

/**
 * 取得熱門課程排行
 * @param limit 取前 N 名
 * @param days 可選，限制最近 N 天內的訂單（不傳則統計全部）
 */
export async function getTopCourses(limit: number = 10, days?: number): Promise<TopCourse[]> {
  await requireAdminAuth()

  // 查詢已付款訂單的課程統計
  const whereClause: { status: 'PAID'; paidAt?: { gte: Date } } = { status: 'PAID' }
  if (days) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)
    whereClause.paidAt = { gte: startDate }
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    select: {
      courseId: true,
      amount: true,
    },
  })

  // 統計每個課程的銷售數據
  const courseStats = new Map<string, { revenue: number; orders: number }>()

  orders.forEach((order) => {
    const existing = courseStats.get(order.courseId)
    if (existing) {
      existing.revenue += order.amount
      existing.orders += 1
    } else {
      courseStats.set(order.courseId, { revenue: order.amount, orders: 1 })
    }
  })

  // 按營收排序並取前 N 名
  const sortedCourseIds = Array.from(courseStats.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, limit)
    .map(([courseId]) => courseId)

  if (sortedCourseIds.length === 0) {
    return []
  }

  // 查詢課程資訊
  const courses = await prisma.course.findMany({
    where: { id: { in: sortedCourseIds } },
    select: {
      id: true,
      title: true,
      coverImage: true,
    },
  })

  const courseMap = new Map(courses.map((c) => [c.id, c]))

  // 組合結果
  const result: TopCourse[] = sortedCourseIds
    .map((courseId) => {
      const course = courseMap.get(courseId)
      const stats = courseStats.get(courseId)

      if (!course || !stats) return null

      return {
        courseId: course.id,
        courseTitle: course.title,
        coverImage: course.coverImage,
        totalRevenue: stats.revenue,
        totalOrders: stats.orders,
      }
    })
    .filter((item): item is TopCourse => item !== null)

  return result
}

/**
 * 取得付款方式統計
 * @param days 可選，限制最近 N 天內的訂單（不傳則統計全部）
 */
export async function getPaymentMethodStats(days?: number): Promise<PaymentMethodStats[]> {
  await requireAdminAuth()

  // 查詢各付款方式的訂單數
  const whereClause: { status: 'PAID'; paymentMethod: { not: null }; paidAt?: { gte: Date } } = {
    status: 'PAID',
    paymentMethod: { not: null },
  }
  if (days) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)
    whereClause.paidAt = { gte: startDate }
  }

  const orders = await prisma.order.groupBy({
    by: ['paymentMethod'],
    where: whereClause,
    _count: true,
  })

  // 計算總數
  const total = orders.reduce((sum, item) => sum + item._count, 0)

  // 付款方式標籤對應
  const methodLabels: Record<PaymentMethod, string> = {
    CREDIT_CARD: '信用卡',
    APPLE_PAY: 'Apple Pay',
    GOOGLE_PAY: 'Google Pay',
    ATM: 'ATM 轉帳',
    CVS: '超商代碼',
  }

  // 轉換格式
  const result: PaymentMethodStats[] = orders
    .filter((item) => item.paymentMethod !== null)
    .map((item) => ({
      method: item.paymentMethod as PaymentMethod,
      label: methodLabels[item.paymentMethod as PaymentMethod],
      count: item._count,
      percentage: total > 0 ? Math.round((item._count / total) * 1000) / 10 : 0,
    }))

  // 按數量排序
  result.sort((a, b) => b.count - a.count)

  return result
}

/**
 * 取得最近 N 天的銷售數據（快速查詢）
 */
export async function getRecentSales(days: number = 30): Promise<DailySales[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days + 1)

  return getDailySales(
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  )
}

/**
 * 用戶成長趨勢資料
 */
export interface UserGrowthData {
  date: string
  newUsers: number
  cumulativeUsers: number
}

/**
 * 取得用戶成長趨勢（最近 N 天）
 */
export async function getUserGrowthTrend(days: number = 30): Promise<UserGrowthData[]> {
  await requireAdminAuth()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days + 1)
  startDate.setHours(0, 0, 0, 0)

  // 查詢起始日期前的累計用戶數
  const baseCount = await prisma.user.count({
    where: {
      role: 'USER',
      createdAt: { lt: startDate },
    },
  })

  // 查詢期間內新增的用戶
  const newUsers = await prisma.user.findMany({
    where: {
      role: 'USER',
      createdAt: { gte: startDate },
    },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  // 建立日期範圍（使用台灣時區）
  const dateMap = new Map<string, number>()
  const current = new Date(startDate)
  const now = new Date()

  while (current <= now) {
    dateMap.set(toTWDateString(current), 0)
    current.setDate(current.getDate() + 1)
  }

  // 統計每日新增用戶（使用台灣時區）
  newUsers.forEach((user) => {
    const dateStr = toTWDateString(user.createdAt)
    const existing = dateMap.get(dateStr)
    if (existing !== undefined) {
      dateMap.set(dateStr, existing + 1)
    }
  })

  // 轉換為陣列，計算累計
  const result: UserGrowthData[] = []
  let cumulative = baseCount

  dateMap.forEach((count, date) => {
    cumulative += count
    result.push({ date, newUsers: count, cumulativeUsers: cumulative })
  })

  result.sort((a, b) => a.date.localeCompare(b.date))
  return result
}

/**
 * 平台完課率統計
 */
export interface PlatformCompletionStats {
  totalPurchases: number
  completedCourses: number
  completionRate: number
  averageProgress: number
}

/**
 * 取得平台整體完課率統計
 */
export async function getPlatformCompletionStats(): Promise<PlatformCompletionStats> {
  await requireAdminAuth()

  // 取得所有有效購買記錄
  const purchases = await prisma.purchase.findMany({
    where: { revokedAt: null },
    select: {
      userId: true,
      courseId: true,
    },
  })

  if (purchases.length === 0) {
    return { totalPurchases: 0, completedCourses: 0, completionRate: 0, averageProgress: 0 }
  }

  // 取得所有課程的單元數
  const courseLessonCounts = await prisma.lesson.groupBy({
    by: ['chapterId'],
    _count: true,
  })

  // 取得 chapter -> course 的對應
  const chapters = await prisma.chapter.findMany({
    select: { id: true, courseId: true },
  })
  const chapterToCourse = new Map(chapters.map((c) => [c.id, c.courseId]))

  // 計算每門課的總單元數
  const courseTotalLessons = new Map<string, number>()
  courseLessonCounts.forEach((item) => {
    const courseId = chapterToCourse.get(item.chapterId)
    if (courseId) {
      courseTotalLessons.set(courseId, (courseTotalLessons.get(courseId) || 0) + item._count)
    }
  })

  // 取得所有已完成的進度記錄
  const completedProgress = await prisma.lessonProgress.findMany({
    where: { completed: true },
    select: {
      userId: true,
      lesson: {
        select: {
          chapter: {
            select: { courseId: true },
          },
        },
      },
    },
  })

  // 統計每個用戶每門課的完成單元數
  const userCourseCompleted = new Map<string, number>()
  completedProgress.forEach((p) => {
    const key = `${p.userId}:${p.lesson.chapter.courseId}`
    userCourseCompleted.set(key, (userCourseCompleted.get(key) || 0) + 1)
  })

  // 計算完課數和平均進度
  let completedCourses = 0
  let totalProgressSum = 0

  purchases.forEach((purchase) => {
    const totalLessons = courseTotalLessons.get(purchase.courseId) || 0
    if (totalLessons === 0) return

    const key = `${purchase.userId}:${purchase.courseId}`
    const completed = userCourseCompleted.get(key) || 0
    const progress = completed / totalLessons

    totalProgressSum += progress
    if (completed >= totalLessons) {
      completedCourses++
    }
  })

  const totalPurchases = purchases.length
  const completionRate = totalPurchases > 0
    ? Math.round((completedCourses / totalPurchases) * 1000) / 10
    : 0
  const averageProgress = totalPurchases > 0
    ? Math.round((totalProgressSum / totalPurchases) * 1000) / 10
    : 0

  return { totalPurchases, completedCourses, completionRate, averageProgress }
}

/**
 * 轉換漏斗步驟資料
 */
export interface FunnelStep {
  name: string
  count: number
  /** 步進轉換率：相對於上一步驟的轉換百分比 */
  conversionRate: number
  /** 整體轉換率：相對於第一步驟的轉換百分比 */
  overallConversionRate: number
}

/**
 * 每日活躍用戶資料
 */
export interface DailyActiveUsers {
  date: string
  activeUsers: number
}

/**
 * 取得每日活躍學習用戶（基於 WatchTimeLog 心跳記錄）
 * 使用 WatchTimeLog 而非 LessonProgress.lastWatchAt，
 * 因為 lastWatchAt 只記錄最後觀看時間，會覆蓋歷史資料導致 DAU 偏低。
 * WatchTimeLog 記錄每分鐘心跳，可準確還原每日活躍用戶。
 */
export async function getDailyActiveUsers(days: number = 30): Promise<DailyActiveUsers[]> {
  await requireAdminAuth()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days + 1)
  startDate.setHours(0, 0, 0, 0)

  // 查詢期間內的觀看心跳記錄
  const watchLogs = await prisma.watchTimeLog.findMany({
    where: {
      createdAt: { gte: startDate },
    },
    select: {
      userId: true,
      createdAt: true,
    },
  })

  // 建立日期範圍
  const dateMap = new Map<string, Set<string>>()
  const current = new Date(startDate)
  const now = new Date()

  while (current <= now) {
    dateMap.set(toTWDateString(current), new Set())
    current.setDate(current.getDate() + 1)
  }

  // 統計每日不重複用戶
  watchLogs.forEach((log) => {
    const dateStr = toTWDateString(log.createdAt)
    const users = dateMap.get(dateStr)
    if (users) {
      users.add(log.userId)
    }
  })

  const result: DailyActiveUsers[] = []
  dateMap.forEach((users, date) => {
    result.push({ date, activeUsers: users.size })
  })

  result.sort((a, b) => a.date.localeCompare(b.date))
  return result
}

/**
 * 精度類型：
 * - hourly: 當日，精確到小時
 * - daily: 本週/最近一個月，精確到天
 * - weekly: 最近一年，精確到週
 */
export type Granularity = 'hourly' | 'daily' | 'weekly'

/**
 * 根據天數自動決定精度
 */
function getGranularity(days: number): Granularity {
  if (days <= 1) return 'hourly'
  if (days <= 30) return 'daily'
  return 'weekly'
}

/**
 * 將日期轉為指定精度的 key（使用台灣時區）
 */
function toGranularityKey(date: Date, granularity: Granularity): string {
  if (granularity === 'hourly') {
    return toTWHourKey(date)
  }
  if (granularity === 'weekly') {
    // 取該週的週一作為 key（基於台灣時區的日期）
    const twDateStr = toTWDateString(date)
    const d = new Date(twDateStr + 'T00:00:00+08:00')
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    return toTWDateString(d)
  }
  return toTWDateString(date)
}

/**
 * 建立時間桶（根據精度）
 */
function buildTimeBuckets(startDate: Date, endDate: Date, granularity: Granularity): string[] {
  const buckets: string[] = []
  const current = new Date(startDate)

  if (granularity === 'hourly') {
    current.setMinutes(0, 0, 0)
    while (current <= endDate) {
      buckets.push(toGranularityKey(current, granularity))
      current.setHours(current.getHours() + 1)
    }
  } else if (granularity === 'weekly') {
    // 對齊到週一
    const day = current.getDay()
    const diff = current.getDate() - day + (day === 0 ? -6 : 1)
    current.setDate(diff)
    while (current <= endDate) {
      buckets.push(toGranularityKey(current, granularity))
      current.setDate(current.getDate() + 7)
    }
  } else {
    while (current <= endDate) {
      buckets.push(toGranularityKey(current, granularity))
      current.setDate(current.getDate() + 1)
    }
  }

  return buckets
}

/**
 * 取得銷售趨勢（支援精度）
 */
export async function getSalesTrend(days: number): Promise<DailySales[]> {
  await requireAdminAuth()

  const granularity = getGranularity(days)
  const endDate = new Date()
  const startDate = new Date()
  if (granularity === 'hourly') {
    startDate.setHours(startDate.getHours() - 24)
  } else {
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)
  }

  const orders = await prisma.order.findMany({
    where: {
      status: 'PAID',
      paidAt: { gte: startDate, lte: endDate },
    },
    select: { amount: true, paidAt: true },
  })

  const buckets = buildTimeBuckets(startDate, endDate, granularity)
  const dataMap = new Map<string, { revenue: number; orders: number }>()
  buckets.forEach((key) => dataMap.set(key, { revenue: 0, orders: 0 }))

  orders.forEach((order) => {
    if (order.paidAt) {
      const key = toGranularityKey(order.paidAt, granularity)
      const existing = dataMap.get(key)
      if (existing) {
        existing.revenue += order.amount
        existing.orders += 1
      }
    }
  })

  const result: DailySales[] = []
  dataMap.forEach((value, key) => {
    result.push({ date: key, revenue: value.revenue, orders: value.orders })
  })
  result.sort((a, b) => a.date.localeCompare(b.date))
  return result
}

/**
 * 取得用戶成長趨勢（支援精度）
 */
export async function getUserGrowthTrendWithGranularity(days: number): Promise<UserGrowthData[]> {
  await requireAdminAuth()

  const granularity = getGranularity(days)
  const endDate = new Date()
  const startDate = new Date()
  if (granularity === 'hourly') {
    startDate.setHours(startDate.getHours() - 24)
  } else {
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)
  }

  const baseCount = await prisma.user.count({
    where: { role: 'USER', createdAt: { lt: startDate } },
  })

  const newUsers = await prisma.user.findMany({
    where: { role: 'USER', createdAt: { gte: startDate } },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const buckets = buildTimeBuckets(startDate, endDate, granularity)
  const dataMap = new Map<string, number>()
  buckets.forEach((key) => dataMap.set(key, 0))

  newUsers.forEach((user) => {
    const key = toGranularityKey(user.createdAt, granularity)
    const existing = dataMap.get(key)
    if (existing !== undefined) {
      dataMap.set(key, existing + 1)
    }
  })

  const result: UserGrowthData[] = []
  let cumulative = baseCount

  buckets.forEach((key) => {
    const count = dataMap.get(key) || 0
    cumulative += count
    result.push({ date: key, newUsers: count, cumulativeUsers: cumulative })
  })

  return result
}

/**
 * 取得活躍學習用戶趨勢（支援精度）
 * 使用 WatchTimeLog 心跳記錄，準確統計每個時間桶的不重複用戶數
 */
export async function getActiveUsersTrend(days: number): Promise<DailyActiveUsers[]> {
  await requireAdminAuth()

  const granularity = getGranularity(days)
  const endDate = new Date()
  const startDate = new Date()
  if (granularity === 'hourly') {
    startDate.setHours(startDate.getHours() - 24)
  } else {
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)
  }

  const watchLogs = await prisma.watchTimeLog.findMany({
    where: { createdAt: { gte: startDate } },
    select: { userId: true, createdAt: true },
  })

  const buckets = buildTimeBuckets(startDate, endDate, granularity)
  const dataMap = new Map<string, Set<string>>()
  buckets.forEach((key) => dataMap.set(key, new Set()))

  watchLogs.forEach((log) => {
    const key = toGranularityKey(log.createdAt, granularity)
    const users = dataMap.get(key)
    if (users) users.add(log.userId)
  })

  const result: DailyActiveUsers[] = []
  buckets.forEach((key) => {
    const users = dataMap.get(key)
    result.push({ date: key, activeUsers: users?.size || 0 })
  })

  return result
}
