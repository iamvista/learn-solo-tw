// app/(admin)/admin/analytics/page.tsx
// 銷售分析頁
// 顯示營收統計、銷售趨勢、熱門課程排行等

import { Suspense } from 'react'
import Link from 'next/link'
import {
  getSalesAnalytics,
  getRecentSales,
  getTopCourses,
  getPaymentMethodStats,
} from '@/lib/actions/analytics'
import { StatCard } from '@/components/admin/stat-card'
import { SalesChart } from '@/components/admin/analytics/sales-chart'
import { TopCoursesTable } from '@/components/admin/analytics/top-courses-table'
import { PaymentPieChart } from '@/components/admin/analytics/payment-pie-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  ArrowLeft,
  Loader2,
} from 'lucide-react'

export const metadata = {
  title: '銷售分析',
}

// 營收統計區塊
async function RevenueStatsSection() {
  const analytics = await getSalesAnalytics()

  // 決定成長率圖示和顏色
  const growthIcon =
    analytics.monthlyGrowth >= 0 ? (
      <TrendingUp className="h-4 w-4 text-[#F5A524]" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    )

  const growthColor =
    analytics.monthlyGrowth >= 0 ? 'text-[#F5A524]' : 'text-red-500'

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="總營收"
        value={`NT$ ${analytics.totalRevenue.toLocaleString()}`}
        icon={<DollarSign className="h-4 w-4 text-[#F5A524]" />}
      />
      <StatCard
        title="本月營收"
        value={`NT$ ${analytics.thisMonthRevenue.toLocaleString()}`}
        description={
          <span className={growthColor}>
            {analytics.monthlyGrowth >= 0 ? '+' : ''}
            {analytics.monthlyGrowth}% 相比上月
          </span>
        }
        icon={growthIcon}
      />
      <StatCard
        title="總訂單數"
        value={analytics.totalOrders.toString()}
        icon={<ShoppingCart className="h-4 w-4 text-[#525252]" />}
      />
      <StatCard
        title="平均客單價"
        value={`NT$ ${analytics.averageOrderValue.toLocaleString()}`}
        icon={<DollarSign className="h-4 w-4 text-[#525252]" />}
      />
    </div>
  )
}

// 月營收比較區塊
async function MonthComparisonSection() {
  const analytics = await getSalesAnalytics()

  return (
    <Card className="bg-white border-[#E5E5E5]">
      <CardHeader>
        <CardTitle className="text-[#0A0A0A]">月營收比較</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* 本月 */}
          <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E5E5]">
            <p className="text-[#525252] text-sm mb-1">本月營收</p>
            <p className="text-2xl font-bold text-[#F5A524]">
              NT$ {analytics.thisMonthRevenue.toLocaleString()}
            </p>
            <p className="text-[#A3A3A3] text-sm mt-1">
              {analytics.thisMonthOrders} 筆訂單
            </p>
          </div>

          {/* 上月 */}
          <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E5E5]">
            <p className="text-[#525252] text-sm mb-1">上月營收</p>
            <p className="text-2xl font-bold text-[#0A0A0A]">
              NT$ {analytics.lastMonthRevenue.toLocaleString()}
            </p>
            <p className="text-[#A3A3A3] text-sm mt-1">
              {analytics.lastMonthOrders} 筆訂單
            </p>
          </div>
        </div>

        {/* 成長率 */}
        <div className="mt-4 p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E5E5] flex items-center justify-between">
          <span className="text-[#525252]">月營收成長率</span>
          <span
            className={`text-lg font-bold ${
              analytics.monthlyGrowth >= 0 ? 'text-[#F5A524]' : 'text-red-500'
            }`}
          >
            {analytics.monthlyGrowth >= 0 ? '+' : ''}
            {analytics.monthlyGrowth}%
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// 銷售趨勢圖區塊
async function SalesChartSection() {
  const dailySales = await getRecentSales(30)

  return <SalesChart data={dailySales} />
}

// 熱門課程區塊
async function TopCoursesSection() {
  const topCourses = await getTopCourses(5)

  return <TopCoursesTable courses={topCourses} />
}

// 付款方式統計區塊
async function PaymentStatsSection() {
  const paymentStats = await getPaymentMethodStats()

  return <PaymentPieChart data={paymentStats} />
}

// 載入中狀態
function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-[104px] bg-white border border-[#E5E5E5] rounded-xl animate-pulse"
        />
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Card className="bg-white border-[#E5E5E5]">
      <CardHeader>
        <div className="h-6 w-32 bg-[#FAFAFA] rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#A3A3A3]" />
        </div>
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card className="bg-white border-[#E5E5E5]">
      <CardHeader>
        <div className="h-6 w-32 bg-[#FAFAFA] rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-12 bg-[#FAFAFA] rounded animate-pulse"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function AnalyticsPage() {
  return (
    <div className="space-y-6 p-4">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]"
          >
            <Link href="/admin/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回訂單管理
            </Link>
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[#0A0A0A]">銷售分析</h2>
        <p className="text-[#525252] mt-1">
          查看營收統計、銷售趨勢和熱門課程數據
        </p>
      </div>

      {/* 營收統計 */}
      <Suspense fallback={<StatsSkeleton />}>
        <RevenueStatsSection />
      </Suspense>

      {/* 銷售趨勢圖 */}
      <Suspense fallback={<ChartSkeleton />}>
        <SalesChartSection />
      </Suspense>

      {/* 兩欄佈局 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 月營收比較 */}
        <Suspense fallback={<ChartSkeleton />}>
          <MonthComparisonSection />
        </Suspense>

        {/* 付款方式統計 */}
        <Suspense fallback={<ChartSkeleton />}>
          <PaymentStatsSection />
        </Suspense>
      </div>

      {/* 熱門課程排行 */}
      <Suspense fallback={<TableSkeleton />}>
        <TopCoursesSection />
      </Suspense>
    </div>
  )
}
