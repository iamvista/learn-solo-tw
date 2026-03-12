// app/(admin)/admin/page-client.tsx
// 後台儀表板客戶端元件
// 每張圖表卡片有獨立的時間選擇器

'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { StatCard } from '@/components/admin/stat-card'
import { ChartCardWrapper, type TimePeriodDays } from '@/components/admin/analytics/chart-card-wrapper'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DollarSign,
  ShoppingCart,
  Users,
  BookOpen,
  Plus,
  ArrowRight,
  Package,
  GraduationCap,
  TrendingUp,
  Activity,
  Trophy,
  CreditCard,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getSalesTrend,
  getUserGrowthTrendWithGranularity,
  getActiveUsersTrend,
  getTopCourses,
  getPaymentMethodStats,
} from '@/lib/actions/analytics'
import { getPostHogFunnel } from '@/lib/actions/posthog-analytics'

// Recharts imports
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

import type { DashboardStats, RecentOrder } from '@/lib/actions/admin'
import type {
  SalesAnalytics,
  DailySales,
  TopCourse,
  PaymentMethodStats,
  UserGrowthData,
  PlatformCompletionStats,
  DailyActiveUsers,
  FunnelStep,
} from '@/lib/actions/analytics'

// ─── 工具函式 ───

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency', currency: 'TWD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

function formatAmount(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}萬`
  return value.toLocaleString()
}

function formatDateStr(date: Date | string): string {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

function formatXLabel(dateStr: string): string {
  // hourly: "2026-03-09 14:00" → "14:00"
  if (dateStr.includes(' ')) return dateStr.split(' ')[1]
  // daily/weekly: "2026-03-09" → "03/09"
  return format(new Date(dateStr), 'MM/dd')
}

function formatTooltipDate(dateStr: string): string {
  if (dateStr.includes(' ')) {
    const [d, t] = dateStr.split(' ')
    return `${format(new Date(d), 'yyyy年MM月dd日', { locale: zhTW })} ${t}`
  }
  return format(new Date(dateStr), 'yyyy年MM月dd日', { locale: zhTW })
}

const orderStatusMap: Record<string, { label: string; className: string }> = {
  PENDING: { label: '待付款', className: 'text-[#C41E3A]' },
  PAID: { label: '已付款', className: 'text-emerald-600' },
  FAILED: { label: '付款失敗', className: 'text-red-500' },
  REFUNDED: { label: '已退款', className: 'text-[#A3A3A3]' },
  CANCELLED: { label: '已取消', className: 'text-[#A3A3A3]' },
}

const PIE_COLORS = ['#C41E3A', '#525252', '#A3A3A3', '#E5E5E5', '#0A0A0A']
const FUNNEL_COLORS = ['#C41E3A', '#A01830', '#525252', '#A3A3A3']

// ─── Tooltip 元件 ───

function SalesTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl p-3">
      <p className="text-[#0A0A0A] text-sm mb-2 font-medium">{formatTooltipDate(label || '')}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[#525252] text-sm">{entry.name === 'revenue' ? '營收' : '訂單數'}:</span>
          <span className="text-[#0A0A0A] font-medium text-sm">
            {entry.name === 'revenue' ? `NT$ ${entry.value.toLocaleString()}` : `${entry.value} 筆`}
          </span>
        </div>
      ))}
    </div>
  )
}

function GrowthTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl p-3">
      <p className="text-[#0A0A0A] text-sm mb-2 font-medium">{formatTooltipDate(label || '')}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[#525252] text-sm">{entry.name === 'newUsers' ? '新增用戶' : '累計用戶'}:</span>
          <span className="text-[#0A0A0A] font-medium text-sm">{entry.value} 人</span>
        </div>
      ))}
    </div>
  )
}

function DAUTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl p-3">
      <p className="text-[#0A0A0A] text-sm mb-1 font-medium">{formatTooltipDate(label || '')}</p>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-[#C41E3A]" />
        <span className="text-[#525252] text-sm">學習人數:</span>
        <span className="text-[#0A0A0A] font-medium text-sm">{payload[0].value} 人</span>
      </div>
    </div>
  )
}

// ─── Props ───

interface DashboardPageClientProps {
  userName: string
  stats: DashboardStats
  salesAnalytics: SalesAnalytics
  recentOrders: RecentOrder[]
  dailySales: DailySales[]
  topCourses: TopCourse[]
  paymentMethodStats: PaymentMethodStats[]
  userGrowth: UserGrowthData[]
  completionStats: PlatformCompletionStats
  dauData: DailyActiveUsers[]
  funnelData: FunnelStep[]
}

// ─── 主元件 ───

export function DashboardPageClient({
  userName,
  stats,
  salesAnalytics,
  recentOrders,
  dailySales: initialDailySales,
  topCourses: initialTopCourses,
  paymentMethodStats: initialPaymentMethodStats,
  userGrowth: initialUserGrowth,
  completionStats,
  dauData: initialDauData,
  funnelData: initialFunnelData,
}: DashboardPageClientProps) {
  // 各圖表獨立 state
  const [dailySales, setDailySales] = useState(initialDailySales)
  const [topCourses, setTopCourses] = useState(initialTopCourses)
  const [paymentMethodStats, setPaymentMethodStats] = useState(initialPaymentMethodStats)
  const [userGrowth, setUserGrowth] = useState(initialUserGrowth)
  const [dauData, setDauData] = useState(initialDauData)
  const [funnelData, setFunnelData] = useState(initialFunnelData)

  // 各圖表的 period change handler
  const handleSalesPeriodChange = useCallback(async (days: TimePeriodDays) => {
    const data = await getSalesTrend(days)
    setDailySales(data)
  }, [])

  const handleGrowthPeriodChange = useCallback(async (days: TimePeriodDays) => {
    const data = await getUserGrowthTrendWithGranularity(days)
    setUserGrowth(data)
  }, [])

  const handleDAUPeriodChange = useCallback(async (days: TimePeriodDays) => {
    const data = await getActiveUsersTrend(days)
    setDauData(data)
  }, [])

  const handleFunnelPeriodChange = useCallback(async (days: TimePeriodDays) => {
    const data = await getPostHogFunnel(days).catch(() => [])
    setFunnelData(data)
  }, [])

  const handleTopCoursesPeriodChange = useCallback(async (days: TimePeriodDays) => {
    const data = await getTopCourses(5, days)
    setTopCourses(data)
  }, [])

  const handlePaymentPeriodChange = useCallback(async (days: TimePeriodDays) => {
    const data = await getPaymentMethodStats(days)
    setPaymentMethodStats(data)
  }, [])

  // 計算訂單成長率
  const orderGrowth =
    salesAnalytics.lastMonthOrders > 0
      ? Math.round(((salesAnalytics.thisMonthOrders - salesAnalytics.lastMonthOrders) / salesAnalytics.lastMonthOrders) * 1000) / 10
      : salesAnalytics.thisMonthOrders > 0 ? 100 : 0

  // 圓餅圖資料
  const pieChartData = paymentMethodStats.map((item) => ({
    method: item.method, label: item.label, count: item.count, percentage: item.percentage,
  }))

  return (
    <div className="space-y-6 p-4">
      {/* 歡迎訊息 */}
      <div>
        <h2 className="text-2xl font-bold text-[#0A0A0A]">歡迎回來，{userName}</h2>
        <p className="text-[#525252] mt-1">這是您的課程平台營運概況</p>
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="本月營收" value={formatCurrency(salesAnalytics.thisMonthRevenue)} description="本月累計營收" icon={<DollarSign className="h-4 w-4 text-[#A3A3A3]" />}
          trend={salesAnalytics.monthlyGrowth !== 0 ? { value: Math.abs(salesAnalytics.monthlyGrowth), isPositive: salesAnalytics.monthlyGrowth > 0 } : undefined} />
        <StatCard title="本月訂單" value={salesAnalytics.thisMonthOrders} description="本月已完成訂單數" icon={<ShoppingCart className="h-4 w-4 text-[#A3A3A3]" />}
          trend={orderGrowth !== 0 ? { value: Math.abs(orderGrowth), isPositive: orderGrowth > 0 } : undefined} />
        <StatCard title="總營收" value={formatCurrency(stats.totalRevenue)} description="累計至今" icon={<TrendingUp className="h-4 w-4 text-[#A3A3A3]" />} />
        <StatCard title="總學員數" value={stats.totalUsers} description="已註冊學員" icon={<Users className="h-4 w-4 text-[#A3A3A3]" />} />
        <StatCard title="平均完課率" value={`${completionStats.completionRate}%`} description={`平均進度 ${completionStats.averageProgress}%`} icon={<GraduationCap className="h-4 w-4 text-[#A3A3A3]" />} />
        <StatCard title="課程數量" value={stats.totalCourses} description="已建立課程" icon={<BookOpen className="h-4 w-4 text-[#A3A3A3]" />} />
      </div>

      {/* 銷售趨勢 + 付款方式 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCardWrapper title="銷售趨勢" icon={<TrendingUp className="h-5 w-5 text-[#525252]" />} onPeriodChange={handleSalesPeriodChange}>
            {dailySales.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-[#A3A3A3]">暫無銷售數據</div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySales} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                    <XAxis dataKey="date" tickFormatter={formatXLabel} stroke="#A3A3A3" fontSize={12} />
                    <YAxis yAxisId="revenue" orientation="left" tickFormatter={formatAmount} stroke="#A3A3A3" fontSize={12} />
                    <YAxis yAxisId="orders" orientation="right" stroke="#A3A3A3" fontSize={12} />
                    <Tooltip content={<SalesTooltip />} />
                    <Legend formatter={(v) => <span className="text-[#525252] text-sm">{v === 'revenue' ? '營收' : '訂單數'}</span>} />
                    <Line yAxisId="revenue" type="monotone" dataKey="revenue" name="revenue" stroke="#C41E3A" strokeWidth={2} dot={{ fill: '#C41E3A', strokeWidth: 2, r: 3 }} activeDot={{ r: 5, fill: '#C41E3A' }} />
                    <Line yAxisId="orders" type="monotone" dataKey="orders" name="orders" stroke="#525252" strokeWidth={2} dot={{ fill: '#525252', strokeWidth: 2, r: 3 }} activeDot={{ r: 5, fill: '#525252' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCardWrapper>
        </div>

        <div>
          <ChartCardWrapper title="付款方式分布" icon={<CreditCard className="h-5 w-5 text-[#525252]" />} onPeriodChange={handlePaymentPeriodChange}>
            {paymentMethodStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[250px] text-[#A3A3A3]">暫無付款數據</div>
            ) : (
              <>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieChartData} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}
                        label={({ payload }) => `${(payload as { percentage: number }).percentage}%`} labelLine={false}>
                        {pieChartData.map((_, i) => <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />)}
                      </Pie>
                      <Tooltip content={({ active, payload: tp }) => {
                        if (!active || !tp?.length) return null
                        const d = tp[0].payload as PaymentMethodStats
                        return (
                          <div className="bg-white border border-[#E5E5E5] rounded-xl p-3">
                            <p className="text-[#0A0A0A] font-medium mb-1">{d.label}</p>
                            <p className="text-[#525252] text-sm">訂單數: <span className="text-[#0A0A0A]">{d.count} 筆</span></p>
                            <p className="text-[#525252] text-sm">佔比: <span className="text-[#0A0A0A]">{d.percentage}%</span></p>
                          </div>
                        )
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {paymentMethodStats.map((item, i) => (
                    <div key={item.method} className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-[#0A0A0A] text-sm">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[#525252] text-sm">{item.count} 筆</span>
                        <span className="text-[#0A0A0A] text-sm font-medium w-16 text-right">{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ChartCardWrapper>
        </div>
      </div>

      {/* 用戶成長 + 每日學習人數 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCardWrapper title="用戶成長趨勢" icon={<Users className="h-5 w-5 text-[#525252]" />} onPeriodChange={handleGrowthPeriodChange}>
          {userGrowth.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-[#A3A3A3]">暫無用戶數據</div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={userGrowth} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C41E3A" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#C41E3A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis dataKey="date" tickFormatter={formatXLabel} stroke="#A3A3A3" fontSize={12} />
                  <YAxis yAxisId="cumulative" orientation="left" stroke="#A3A3A3" fontSize={12} />
                  <YAxis yAxisId="daily" orientation="right" stroke="#A3A3A3" fontSize={12} />
                  <Tooltip content={<GrowthTooltip />} />
                  <Area yAxisId="cumulative" type="monotone" dataKey="cumulativeUsers" name="cumulativeUsers" stroke="#C41E3A" strokeWidth={2} fill="url(#colorCumulative)" />
                  <Bar yAxisId="daily" dataKey="newUsers" name="newUsers" fill="#525252" radius={[2, 2, 0, 0]} barSize={12} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCardWrapper>

        <ChartCardWrapper title="每日學習人數" icon={<Activity className="h-5 w-5 text-[#525252]" />} onPeriodChange={handleDAUPeriodChange}>
          {dauData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-[#A3A3A3]">暫無學習活動數據</div>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dauData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorDAU" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C41E3A" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#C41E3A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis dataKey="date" tickFormatter={formatXLabel} stroke="#A3A3A3" fontSize={12} />
                  <YAxis stroke="#A3A3A3" fontSize={12} />
                  <Tooltip content={<DAUTooltip />} />
                  <Area type="monotone" dataKey="activeUsers" stroke="#C41E3A" strokeWidth={2} fill="url(#colorDAU)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCardWrapper>
      </div>

      {/* 轉換漏斗 + 熱門課程 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCardWrapper title="轉換漏斗" icon={<Filter className="h-5 w-5 text-[#525252]" />} onPeriodChange={handleFunnelPeriodChange}>
          {funnelData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-[#A3A3A3]">暫無轉換數據</div>
          ) : (
            <>
              {/* 表頭 */}
              <div className="flex items-center gap-3 mb-3 px-1 text-xs text-[#A3A3A3]">
                <span className="w-20 shrink-0">步驟</span>
                <span className="flex-1" />
                <span className="w-16 text-right shrink-0">人數</span>
                <span className="w-20 text-right shrink-0">步進轉換</span>
                <span className="w-20 text-right shrink-0">整體轉換</span>
              </div>

              {/* 漏斗列表 */}
              <div className="space-y-3">
                {funnelData.map((step, i) => {
                  const barWidth = funnelData[0]?.count > 0 ? (step.count / funnelData[0].count) * 100 : 0
                  return (
                    <div key={step.name} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-20 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }} />
                        <span className="text-[#0A0A0A] text-sm truncate">{step.name}</span>
                      </div>
                      <div className="flex-1 h-8 bg-[#FAFAFA] rounded-md overflow-hidden border border-[#F0F0F0]">
                        <div
                          className="h-full rounded-md transition-all duration-500"
                          style={{ width: barWidth > 0 ? `${Math.max(barWidth, 2)}%` : '0%', backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length], opacity: 0.85 }}
                        />
                      </div>
                      <span className="text-[#0A0A0A] text-sm font-medium w-16 text-right shrink-0">{step.count.toLocaleString()}</span>
                      <span className="text-[#0A0A0A] text-sm font-medium w-20 text-right shrink-0">{step.conversionRate}%</span>
                      <span className="text-[#A3A3A3] text-sm w-20 text-right shrink-0">{step.overallConversionRate}%</span>
                    </div>
                  )
                })}
              </div>

              <p className="mt-4 text-xs text-[#A3A3A3]">
                步進轉換：相對上一步的轉換率 ／ 整體轉換：相對第一步的轉換率
              </p>
            </>
          )}
        </ChartCardWrapper>

        <ChartCardWrapper title="熱門課程排行" icon={<Trophy className="h-5 w-5 text-[#C41E3A]" />} onPeriodChange={handleTopCoursesPeriodChange}>
          {topCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-[#A3A3A3]" />
              </div>
              <h3 className="text-lg font-medium text-[#0A0A0A] mb-2">暫無銷售數據</h3>
              <p className="text-sm text-[#A3A3A3]">開始銷售後，熱門課程將顯示於此</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E5E5E5] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-[#E5E5E5] bg-[#FAFAFA]">
                    <th className="text-[#525252] text-sm font-medium w-16 text-center p-3">排名</th>
                    <th className="text-[#525252] text-sm font-medium text-left p-3">課程名稱</th>
                    <th className="text-[#525252] text-sm font-medium text-center w-24 p-3">訂單數</th>
                    <th className="text-[#525252] text-sm font-medium text-right w-32 p-3">總營收</th>
                    <th className="text-[#525252] text-sm font-medium w-16 text-right p-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {topCourses.map((course, index) => {
                    const rank = index + 1
                    const rankStyles: Record<number, string> = { 1: 'bg-[#C41E3A] text-white', 2: 'bg-[#525252] text-white', 3: 'bg-[#A3A3A3] text-white' }
                    const rankStyle = rankStyles[rank] || 'bg-[#E5E5E5] text-[#525252]'
                    return (
                      <tr key={course.courseId} className="border-t border-[#E5E5E5] hover:bg-[#FAFAFA]">
                        <td className="text-center p-3">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${rankStyle}`}>{rank}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {course.coverImage && <img src={course.coverImage} alt={course.courseTitle} className="w-12 h-8 object-cover rounded-lg" />}
                            <span className="text-[#0A0A0A] font-medium line-clamp-1">{course.courseTitle}</span>
                          </div>
                        </td>
                        <td className="text-center p-3"><span className="text-[#525252]">{course.totalOrders} 筆</span></td>
                        <td className="text-right p-3"><span className="text-[#C41E3A] font-medium">{formatCurrency(course.totalRevenue)}</span></td>
                        <td className="text-right p-3">
                          <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]">
                            <Link href={`/admin/courses/${course.courseId}`}><ArrowRight className="h-4 w-4" /></Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ChartCardWrapper>
      </div>

      {/* 快速操作和最近訂單 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-white border-[#E5E5E5] rounded-xl">
          <CardHeader>
            <CardTitle className="text-[#0A0A0A]">快速操作</CardTitle>
            <CardDescription className="text-[#525252]">常用功能快捷入口</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start bg-[#C41E3A] hover:bg-[#A01830] text-white rounded-lg">
              <Link href="/admin/courses/new"><Plus className="mr-2 h-4 w-4" />新增課程</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg">
              <Link href="/admin/orders"><Package className="mr-2 h-4 w-4" />查看訂單</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg">
              <Link href="/admin/users"><Users className="mr-2 h-4 w-4" />管理學員</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-white border-[#E5E5E5] rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[#0A0A0A]">最近訂單</CardTitle>
              <CardDescription className="text-[#525252]">最新的訂單記錄</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]">
              <Link href="/admin/orders">查看全部<ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order) => {
                  const status = orderStatusMap[order.status] ?? { label: order.status, className: 'text-[#A3A3A3]' }
                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-[#0A0A0A]">{order.userName}</p>
                        <p className="text-xs text-[#525252]">{order.courseTitle}</p>
                        <p className="text-xs text-[#A3A3A3]">{order.orderNo}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm font-medium text-[#0A0A0A]">{formatCurrency(order.amount)}</p>
                        <p className={`text-xs ${status.className}`}>{status.label}</p>
                        <p className="text-xs text-[#A3A3A3]">{formatDateStr(order.createdAt)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingCart className="h-12 w-12 text-[#E5E5E5] mb-4" />
                <p className="text-[#525252]">目前沒有訂單記錄</p>
                <p className="text-xs text-[#A3A3A3] mt-1">當有學員購買課程時，訂單會顯示在這裡</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
