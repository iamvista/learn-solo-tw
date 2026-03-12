// app/(admin)/admin/media/videos/page.tsx
// 影片管理頁面
// 顯示所有影片列表，支援上傳、搜尋和刪除

import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getMediaList } from '@/lib/actions/media'
import { Film, Upload, ArrowLeft, Loader2 } from 'lucide-react'
import { VideosClient } from './videos-client'

export const metadata = {
  title: '影片管理',
}

interface VideosPageProps {
  searchParams: Promise<{
    search?: string
    page?: string
  }>
}

// 影片列表區塊
async function VideoListSection({
  search,
  page,
}: {
  search?: string
  page?: string
}) {
  const currentPage = page ? parseInt(page, 10) : 1
  const pageSize = 12

  const result = await getMediaList({
    type: 'VIDEO',
    search,
    page: currentPage,
    pageSize,
  })

  return (
    <VideosClient
      initialData={result}
      searchQuery={search}
      streamCustomerCode={process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE || ''}
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

export default async function VideosPage({ searchParams }: VideosPageProps) {
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
            <h2 className="text-2xl font-bold text-[#0A0A0A]">影片管理</h2>
            <p className="text-[#525252] mt-1">
              管理您的所有影片檔案
            </p>
          </div>
        </div>
      </div>

      {/* 影片列表卡片 */}
      <Card className="bg-white border-[#E5E5E5] rounded-xl">
        <CardHeader>
          <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
            <Film className="w-5 h-5 text-[#C41E3A]" />
            影片列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoadingState />}>
            <VideoListSection
              search={params.search}
              page={params.page}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
