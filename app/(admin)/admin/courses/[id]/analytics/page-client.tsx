// app/(admin)/admin/courses/[id]/analytics/page-client.tsx
// 課程結果分析頁面的 Client 元件
// 包含互動式圖表和學員列表

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import {
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type {
  CourseSalesStats,
  CourseStudent,
  CourseDailySales,
  CoursePaymentStats,
  CourseOverview,
  ProgressDistribution,
  LessonCompletionData,
  WatchTimeDistribution,
} from '@/lib/actions/course-analytics'

// 圖表元件
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface AnalyticsPageClientProps {
  courseId: string
  salesStats: CourseSalesStats
  students: CourseStudent[]
  dailySales: CourseDailySales[]
  paymentStats: CoursePaymentStats[]
  overview: CourseOverview
  progressDistribution: ProgressDistribution[]
  lessonCompletionRates: LessonCompletionData[]
  watchTimeStats: {
    averageWatchTime: number
    totalWatchTime: number
    distribution: WatchTimeDistribution[]
  }
}

// 格式化金額
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// 格式化時間（秒 → 時:分:秒）
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours} 小時 ${minutes} 分鐘`
  }
  return `${minutes} 分鐘`
}

// 圓餅圖顏色
const PIE_COLORS = ['#F5A524', '#525252', '#A3A3A3', '#D4D4D4', '#E5E5E5']

// 長條圖顏色
const BAR_COLORS = [
  '#FECACA', // 尚未開始 - 淺紅
  '#FED7AA', // 1-25%
  '#FEF08A', // 26-50%
  '#BBF7D0', // 51-75%
  '#A5F3FC', // 76-99%
  '#86EFAC', // 已完成 - 綠色
]

export function AnalyticsPageClient({
  salesStats,
  students,
  dailySales,
  paymentStats,
  overview,
  progressDistribution,
  lessonCompletionRates,
  watchTimeStats,
}: AnalyticsPageClientProps) {
  const [showAllStudents, setShowAllStudents] = useState(false)

  // 顯示的學員數量
  const displayedStudents = showAllStudents ? students : students.slice(0, 10)

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* 概覽統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-[#E5E5E5]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#525252]">
                總學員數
              </CardTitle>
              <Users className="h-4 w-4 text-[#F5A524]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0A0A0A]">
                {overview.totalStudents}
              </div>
              <p className="text-xs text-[#A3A3A3] mt-1">
                已購買此課程的學員
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E5E5E5]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#525252]">
                總銷售額
              </CardTitle>
              <DollarSign className="h-4 w-4 text-[#F5A524]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0A0A0A]">
                {formatCurrency(salesStats.totalRevenue)}
              </div>
              <p className="text-xs text-[#A3A3A3] mt-1">
                本月 {formatCurrency(salesStats.thisMonthRevenue)}
                {salesStats.monthlyGrowth !== 0 && (
                  <span
                    className={cn(
                      'ml-1',
                      salesStats.monthlyGrowth > 0
                        ? 'text-emerald-600'
                        : 'text-red-500'
                    )}
                  >
                    {salesStats.monthlyGrowth > 0 ? '+' : ''}
                    {salesStats.monthlyGrowth}%
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E5E5E5]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#525252]">
                平均完課率
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-[#F5A524]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0A0A0A]">
                {overview.averageProgress}%
              </div>
              <p className="text-xs text-[#A3A3A3] mt-1">
                完成全部課程: {overview.completionRate}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E5E5E5]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#525252]">
                平均觀看時間
              </CardTitle>
              <Clock className="h-4 w-4 text-[#F5A524]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0A0A0A]">
                {formatDuration(watchTimeStats.averageWatchTime)}
              </div>
              <p className="text-xs text-[#A3A3A3] mt-1">
                每位學員平均觀看時長
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 圖表區 - 第一排 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 銷售趨勢圖 */}
          <Card className="bg-white border-[#E5E5E5]">
            <CardHeader>
              <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#F5A524]" />
                近 30 天銷售趨勢
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailySales.length > 0 ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailySales}>
                      <defs>
                        <linearGradient
                          id="colorRevenue"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#F5A524"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#F5A524"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => format(new Date(date), 'MM/dd')}
                        stroke="#A3A3A3"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="#A3A3A3"
                        fontSize={12}
                        tickFormatter={(value) =>
                          value >= 1000 ? `${value / 1000}k` : value
                        }
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length || !label) return null
                          return (
                            <div className="bg-white border border-[#E5E5E5] rounded-lg p-3 shadow-lg">
                              <p className="text-sm font-medium text-[#0A0A0A] mb-1">
                                {format(new Date(label as string), 'yyyy/MM/dd', {
                                  locale: zhTW,
                                })}
                              </p>
                              <p className="text-sm text-[#525252]">
                                營收: {formatCurrency(payload[0].value as number)}
                              </p>
                              <p className="text-sm text-[#525252]">
                                訂單: {payload[1]?.value || 0} 筆
                              </p>
                            </div>
                          )
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#F5A524"
                        strokeWidth={2}
                        fill="url(#colorRevenue)"
                      />
                      <Line
                        type="monotone"
                        dataKey="orders"
                        stroke="#525252"
                        strokeWidth={2}
                        dot={false}
                        yAxisId={1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-[#A3A3A3]">
                  暫無銷售數據
                </div>
              )}
            </CardContent>
          </Card>

          {/* 學員進度分佈 */}
          <Card className="bg-white border-[#E5E5E5]">
            <CardHeader>
              <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#F5A524]" />
                學員進度分佈
              </CardTitle>
            </CardHeader>
            <CardContent>
              {progressDistribution.length > 0 ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progressDistribution} layout="vertical">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#E5E5E5"
                        horizontal
                      />
                      <XAxis type="number" stroke="#A3A3A3" fontSize={12} />
                      <YAxis
                        type="category"
                        dataKey="range"
                        stroke="#A3A3A3"
                        fontSize={12}
                        width={80}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const data = payload[0].payload as ProgressDistribution
                          return (
                            <div className="bg-white border border-[#E5E5E5] rounded-lg p-3 shadow-lg">
                              <p className="text-sm font-medium text-[#0A0A0A] mb-1">
                                {data.range}
                              </p>
                              <p className="text-sm text-[#525252]">
                                學員數: {data.count} 人
                              </p>
                              <p className="text-sm text-[#525252]">
                                佔比: {data.percentage}%
                              </p>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {progressDistribution.map((_, index) => (
                          <Cell key={index} fill={BAR_COLORS[index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-[#A3A3A3]">
                  暫無學員數據
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 圖表區 - 第二排 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 各單元完成率曲線 */}
          <Card className="bg-white border-[#E5E5E5] lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#F5A524]" />
                各單元完成率
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lessonCompletionRates.length > 0 ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lessonCompletionRates}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                      <XAxis
                        dataKey="order"
                        stroke="#A3A3A3"
                        fontSize={12}
                        label={{
                          value: '單元順序',
                          position: 'insideBottom',
                          offset: -5,
                          fill: '#A3A3A3',
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        stroke="#A3A3A3"
                        fontSize={12}
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const data = payload[0].payload as LessonCompletionData
                          return (
                            <div className="bg-white border border-[#E5E5E5] rounded-lg p-3 shadow-lg max-w-[250px]">
                              <p className="text-xs text-[#A3A3A3] mb-1">
                                {data.chapterTitle}
                              </p>
                              <p className="text-sm font-medium text-[#0A0A0A] mb-2 truncate">
                                {data.lessonTitle}
                              </p>
                              <p className="text-sm text-[#525252]">
                                完成率: {data.completionRate}%
                              </p>
                              <p className="text-sm text-[#525252]">
                                {data.completedCount} / {data.totalStudents} 人
                              </p>
                            </div>
                          )
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="completionRate"
                        stroke="#F5A524"
                        strokeWidth={2}
                        dot={{ fill: '#F5A524', strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 6, fill: '#F5A524' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-[#A3A3A3]">
                  暫無單元數據
                </div>
              )}
            </CardContent>
          </Card>

          {/* 付款方式分佈 */}
          <Card className="bg-white border-[#E5E5E5]">
            <CardHeader>
              <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
                <Award className="h-5 w-5 text-[#F5A524]" />
                付款方式
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentStats.length > 0 ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentStats.map((stat) => ({
                          name: stat.label,
                          value: stat.count,
                          percentage: stat.percentage,
                          revenue: stat.revenue,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, payload }) =>
                          `${name} ${(payload as { percentage: number })?.percentage || 0}%`
                        }
                        labelLine={false}
                      >
                        {paymentStats.map((_, index) => (
                          <Cell
                            key={index}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const data = payload[0].payload as {
                            name: string
                            value: number
                            percentage: number
                            revenue: number
                          }
                          return (
                            <div className="bg-white border border-[#E5E5E5] rounded-lg p-3 shadow-lg">
                              <p className="text-sm font-medium text-[#0A0A0A] mb-1">
                                {data.name}
                              </p>
                              <p className="text-sm text-[#525252]">
                                訂單數: {data.value} 筆
                              </p>
                              <p className="text-sm text-[#525252]">
                                金額: {formatCurrency(data.revenue)}
                              </p>
                            </div>
                          )
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-[#A3A3A3]">
                  暫無付款數據
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 學員列表 */}
        <Card className="bg-white border-[#E5E5E5]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
              <Users className="h-5 w-5 text-[#F5A524]" />
              學員列表
              <span className="text-sm font-normal text-[#A3A3A3]">
                ({students.length} 人)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {students.length > 0 ? (
              <div className="space-y-4">
                {/* 表頭 */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-[#A3A3A3] border-b border-[#E5E5E5]">
                  <div className="col-span-4">學員</div>
                  <div className="col-span-2">購買日期</div>
                  <div className="col-span-2">金額</div>
                  <div className="col-span-2">學習進度</div>
                  <div className="col-span-2">最後觀看</div>
                </div>

                {/* 學員列表 */}
                <div className="space-y-2">
                  {displayedStudents.map((student) => (
                    <div
                      key={student.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 px-4 py-3 rounded-lg bg-[#FAFAFA] hover:bg-[#F5F5F5] transition-colors"
                    >
                      {/* 學員資訊 */}
                      <div className="col-span-4 flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student.image || ''} />
                          <AvatarFallback className="bg-[#F5A524] text-white">
                            {student.name?.[0] || student.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#0A0A0A] truncate">
                            {student.name || '未設定姓名'}
                          </p>
                          <p className="text-xs text-[#A3A3A3] truncate">
                            {student.email}
                          </p>
                        </div>
                      </div>

                      {/* 購買日期 */}
                      <div className="col-span-2 flex items-center">
                        <span className="text-sm text-[#525252]">
                          {format(student.purchasedAt, 'yyyy/MM/dd', {
                            locale: zhTW,
                          })}
                        </span>
                      </div>

                      {/* 金額 */}
                      <div className="col-span-2 flex items-center">
                        {student.orderAmount !== null ? (
                          <span className="text-sm text-[#525252]">
                            {formatCurrency(student.orderAmount)}
                          </span>
                        ) : (
                          <span className="text-xs text-[#A3A3A3] bg-[#E5E5E5] px-2 py-0.5 rounded">
                            手動授權
                          </span>
                        )}
                      </div>

                      {/* 學習進度 */}
                      <div className="col-span-2 flex items-center gap-2">
                        <Progress
                          value={student.progressPercent}
                          className="h-2 flex-1"
                        />
                        <span className="text-xs text-[#525252] min-w-[40px] text-right">
                          {student.progressPercent}%
                        </span>
                      </div>

                      {/* 最後觀看 */}
                      <div className="col-span-2 flex items-center">
                        <span className="text-sm text-[#A3A3A3]">
                          {student.lastWatchAt
                            ? format(student.lastWatchAt, 'MM/dd HH:mm', {
                                locale: zhTW,
                              })
                            : '尚未開始'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 展開/收合按鈕 */}
                {students.length > 10 && (
                  <div className="pt-2 border-t border-[#E5E5E5]">
                    <Button
                      variant="ghost"
                      className="w-full text-[#525252] hover:text-[#0A0A0A]"
                      onClick={() => setShowAllStudents(!showAllStudents)}
                    >
                      {showAllStudents ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          收合列表
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          顯示全部 {students.length} 位學員
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-[#D4D4D4] mb-4" />
                <h3 className="text-lg font-medium text-[#525252] mb-2">
                  尚無學員
                </h3>
                <p className="text-sm text-[#A3A3A3] max-w-sm">
                  當有學員購買此課程時，他們的資訊會顯示在這裡
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
