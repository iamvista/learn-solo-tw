// components/main/my-courses/empty-courses.tsx
// 空狀態組件 - 當用戶沒有購買任何課程時顯示

import Link from 'next/link'
import { BookOpen, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyCourses() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {/* 圖示 */}
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#FAFAFA] border border-[#E5E5E5] shadow-sm">
        <BookOpen className="h-10 w-10 text-[#525252]" />
      </div>

      {/* 標題 */}
      <h2 className="mt-8 text-3xl font-bold tracking-tight text-[#0A0A0A]">
        還沒有購買課程
      </h2>

      {/* 說明文字 */}
      <p className="mt-4 max-w-md text-lg text-[#525252]">
        探索我們的課程，開始您的學習之旅。
      </p>

      {/* CTA 按鈕 */}
      <Button
        asChild
        className="mt-10 rounded-full bg-[#C41E3A] px-10 py-7 text-lg font-semibold text-white transition-all hover:bg-[#A01830] hover:scale-105 active:scale-95 shadow-lg shadow-[#C41E3A]/20"
      >
        <Link href="/">
          瀏覽課程
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>
    </div>
  )
}

