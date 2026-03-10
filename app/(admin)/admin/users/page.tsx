// app/(admin)/admin/users/page.tsx
// 學員列表頁
// 顯示所有學員，支援搜尋、篩選和分頁

import { Suspense } from 'react'
import Link from 'next/link'
import { getUsers } from '@/lib/actions/users'
import { UserTable } from '@/components/admin/users/user-table'
import { UserFilters } from '@/components/admin/users/user-filters'
import { UserPagination } from '@/components/admin/users/user-pagination'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Loader2 } from 'lucide-react'
import { ExportCsvButton } from '@/components/admin/users/export-csv-button'

export const metadata = {
  title: '學員管理',
}

interface UsersPageProps {
  searchParams: Promise<{
    search?: string
    hasPurchase?: string
    page?: string
  }>
}

// 學員列表區塊
async function UserListSection({
  search,
  hasPurchase,
  page,
}: {
  search?: string
  hasPurchase?: string
  page?: string
}) {
  // 解析頁碼
  const currentPage = page ? parseInt(page, 10) : 1
  const pageSize = 20

  // 取得學員列表
  const result = await getUsers({
    search,
    hasPurchase: hasPurchase as 'all' | 'yes' | 'no' | undefined,
    page: currentPage,
    pageSize,
  })

  return (
    <>
      {/* 學員表格 */}
      <UserTable users={result.users} />

      {/* 分頁 */}
      <div className="mt-4">
        <UserPagination
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
function UserListSkeleton() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-[#A3A3A3]" />
    </div>
  )
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams

  return (
    <div className="space-y-6 p-4">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0A0A0A]">學員管理</h2>
          <p className="text-[#525252] mt-1">
            管理所有學員帳號及購買記錄
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
        >
          <Link href="/admin/users/admins">
            <Shield className="mr-2 h-4 w-4" />
            管理員設定
          </Link>
        </Button>
      </div>

      {/* 學員列表卡片 */}
      <Card className="bg-white border-[#E5E5E5] rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#0A0A0A]">學員列表</CardTitle>
            <ExportCsvButton />
          </div>
          {/* 搜尋和篩選 */}
          <div className="pt-4">
            <UserFilters />
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<UserListSkeleton />}>
            <UserListSection
              search={params.search}
              hasPurchase={params.hasPurchase}
              page={params.page}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
