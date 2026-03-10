// app/(admin)/admin/media/images/page.tsx
// 圖片管理頁面
// 顯示所有圖片列表，支援上傳、搜尋和刪除

import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getMediaList } from '@/lib/actions/media'
import { Image as ImageIcon, ArrowLeft, Loader2 } from 'lucide-react'
import { ImagesClient } from './images-client'

export const metadata = {
  title: '圖片管理',
}

interface ImagesPageProps {
  searchParams: Promise<{
    search?: string
    page?: string
  }>
}

// 圖片列表區塊
async function ImageListSection({
  search,
  page,
}: {
  search?: string
  page?: string
}) {
  const currentPage = page ? parseInt(page, 10) : 1
  const pageSize = 20

  const result = await getMediaList({
    type: 'IMAGE',
    search,
    page: currentPage,
    pageSize,
  })

  return (
    <ImagesClient
      initialData={result}
      searchQuery={search}
    />
  )
}

// 載入中狀態
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-[#A3A3A3]" />
    </div>
  )
}

export default async function ImagesPage({ searchParams }: ImagesPageProps) {
  const params = await searchParams

  return (
    <div className="space-y-6 p-4">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]">
            <Link href="/admin/media">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-[#0A0A0A]">圖片管理</h2>
            <p className="text-[#525252] mt-1">
              管理您的所有圖片檔案
            </p>
          </div>
        </div>
      </div>

      {/* 圖片列表卡片 */}
      <Card className="bg-white border-[#E5E5E5] rounded-xl">
        <CardHeader>
          <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#F5A524]" />
            圖片列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoadingState />}>
            <ImageListSection
              search={params.search}
              page={params.page}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
