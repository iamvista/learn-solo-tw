// app/(admin)/admin/page.tsx
// 後台儀表板頁面
// 取得所有統計數據並傳入客戶端元件渲染

import { auth } from '@/lib/auth'
import { getDashboardStats, getRecentOrders } from '@/lib/actions/admin'
import {
  getSalesAnalytics,
  getSalesTrend,
  getTopCourses,
  getPaymentMethodStats,
  getUserGrowthTrendWithGranularity,
  getPlatformCompletionStats,
  getActiveUsersTrend,
} from '@/lib/actions/analytics'
import { getPostHogFunnel } from '@/lib/actions/posthog-analytics'
import { DashboardPageClient } from './page-client'

export const metadata = {
  title: '儀表板',
}

export default async function AdminDashboardPage() {
  const session = await auth()
  const userName = session?.user?.name ?? '管理員'

  // 並行取得所有資料
  const [
    stats,
    salesAnalytics,
    recentOrders,
    dailySales,
    topCourses,
    paymentMethodStats,
    userGrowth,
    completionStats,
    dauData,
    funnelData,
  ] = await Promise.all([
    getDashboardStats(),
    getSalesAnalytics(),
    getRecentOrders(5),
    getSalesTrend(30),
    getTopCourses(5),
    getPaymentMethodStats(),
    getUserGrowthTrendWithGranularity(30),
    getPlatformCompletionStats(),
    getActiveUsersTrend(30),
    getPostHogFunnel(30).catch(() => []),
  ])

  return (
    <DashboardPageClient
      userName={userName}
      stats={stats}
      salesAnalytics={salesAnalytics}
      recentOrders={recentOrders}
      dailySales={dailySales}
      topCourses={topCourses}
      paymentMethodStats={paymentMethodStats}
      userGrowth={userGrowth}
      completionStats={completionStats}
      dauData={dauData}
      funnelData={funnelData}
    />
  )
}
