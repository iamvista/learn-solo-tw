// components/admin/analytics/top-courses-table.tsx
// 熱門課程排行表格元件
// 顯示銷售排名前幾名的課程

'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Trophy, ExternalLink, BookOpen } from 'lucide-react'
import type { TopCourse } from '@/lib/actions/analytics'

interface TopCoursesTableProps {
  courses: TopCourse[]
}

// 格式化金額
function formatAmount(amount: number): string {
  return `NT$ ${amount.toLocaleString()}`
}

// 排名樣式
const rankStyles: Record<number, string> = {
  1: 'bg-[#F5A524] text-white',
  2: 'bg-[#525252] text-white',
  3: 'bg-[#A3A3A3] text-white',
}

export function TopCoursesTable({ courses }: TopCoursesTableProps) {
  if (courses.length === 0) {
    return (
      <Card className="bg-white border-[#E5E5E5]">
        <CardHeader>
          <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#F5A524]" />
            熱門課程排行
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-[#A3A3A3]" />
            </div>
            <h3 className="text-lg font-medium text-[#0A0A0A] mb-2">
              暫無銷售數據
            </h3>
            <p className="text-sm text-[#A3A3A3]">
              開始銷售後，熱門課程將顯示於此
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-[#E5E5E5]">
      <CardHeader>
        <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#F5A524]" />
          熱門課程排行
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-[#E5E5E5] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-[#E5E5E5] hover:bg-transparent bg-[#FAFAFA]">
                <TableHead className="text-[#525252] w-16 text-center">
                  排名
                </TableHead>
                <TableHead className="text-[#525252]">課程名稱</TableHead>
                <TableHead className="text-[#525252] text-center w-24">
                  訂單數
                </TableHead>
                <TableHead className="text-[#525252] text-right w-32">
                  總營收
                </TableHead>
                <TableHead className="text-[#525252] w-16 text-right">
                  操作
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course, index) => {
                const rank = index + 1
                const rankStyle = rankStyles[rank] || 'bg-[#E5E5E5] text-[#525252]'

                return (
                  <TableRow
                    key={course.courseId}
                    className="border-[#E5E5E5] hover:bg-[#FAFAFA]"
                  >
                    {/* 排名 */}
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${rankStyle}`}
                      >
                        {rank}
                      </span>
                    </TableCell>

                    {/* 課程名稱 */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {course.coverImage && (
                          <img
                            src={course.coverImage}
                            alt={course.courseTitle}
                            className="w-12 h-8 object-cover rounded-lg"
                          />
                        )}
                        <span className="text-[#0A0A0A] font-medium line-clamp-1">
                          {course.courseTitle}
                        </span>
                      </div>
                    </TableCell>

                    {/* 訂單數 */}
                    <TableCell className="text-center">
                      <span className="text-[#525252]">
                        {course.totalOrders} 筆
                      </span>
                    </TableCell>

                    {/* 總營收 */}
                    <TableCell className="text-right">
                      <span className="text-[#F5A524] font-medium">
                        {formatAmount(course.totalRevenue)}
                      </span>
                    </TableCell>

                    {/* 操作 */}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 w-8 p-0 text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]"
                      >
                        <Link href={`/admin/courses/${course.courseId}`}>
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">查看課程</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
