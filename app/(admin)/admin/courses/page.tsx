// app/(admin)/admin/courses/page.tsx
// 課程列表頁
// 顯示所有課程，支援搜尋、篩選和分頁

import { Suspense } from 'react'
import Link from 'next/link'
import { getCourses } from '@/lib/actions/courses'
import { CourseTable } from '@/components/admin/courses/course-table'
import { CourseFilters } from '@/components/admin/courses/course-filters'
import { CoursePagination } from '@/components/admin/courses/course-pagination'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Loader2 } from 'lucide-react'
import type { CourseStatus } from '@prisma/client'

export const metadata = {
  title: '課程管理',
}

interface CoursesPageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
  }>
}

// 課程列表區塊
async function CourseListSection({
  search,
  status,
  page,
}: {
  search?: string
  status?: string
  page?: string
}) {
  // 解析頁碼
  const currentPage = page ? parseInt(page, 10) : 1
  const pageSize = 10

  // 取得課程列表
  const result = await getCourses({
    search,
    status: status as CourseStatus | 'ALL' | undefined,
    page: currentPage,
    pageSize,
  })

  return (
    <>
      {/* 課程表格 */}
      <CourseTable courses={result.courses} />

      {/* 分頁 */}
      <div className="mt-4">
        <CoursePagination
          currentPage={result.page}
          totalPages={result.totalPages}
          total={result.total}
          pageSize={result.pageSize}
        />
      </div>
    </>
  )
}

// 載入中狀態
function CourseListSkeleton() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
    </div>
  )
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const params = await searchParams

  return (
    <div className="space-y-6 p-4">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0A0A0A]">課程管理</h2>
          <p className="text-[#525252] mt-1">
            管理您的所有課程內容
          </p>
        </div>
        <Button
          asChild
          className="bg-[#C41E3A] hover:bg-[#A01830] text-white rounded-full"
        >
          <Link href="/admin/courses/new">
            <Plus className="mr-2 h-4 w-4" />
            新增課程
          </Link>
        </Button>
      </div>

      {/* 課程列表卡片 */}
      <Card className="bg-white border-[#E5E5E5] rounded-xl">
        <CardHeader>
          <CardTitle className="text-[#0A0A0A]">課程列表</CardTitle>
          {/* 搜尋和篩選 */}
          <div className="pt-4">
            <CourseFilters />
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<CourseListSkeleton />}>
            <CourseListSection
              search={params.search}
              status={params.status}
              page={params.page}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
