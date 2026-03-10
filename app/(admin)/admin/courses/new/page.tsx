// app/(admin)/admin/courses/new/page.tsx
// 新增課程頁
// 提供課程新增表單

import Link from 'next/link'
import { CourseForm } from '@/components/admin/courses/course-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: '新增課程',
}

export default function NewCoursePage() {
  return (
    <div className="space-y-6 p-4">
      {/* 頁面標題 */}
      <div className="flex items-center gap-4">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA] rounded-lg"
        >
          <Link href="/admin/courses">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-[#0A0A0A]">新增課程</h2>
          <p className="text-[#525252] mt-1">
            建立一個新的課程
          </p>
        </div>
      </div>

      {/* 課程表單 */}
      <CourseForm mode="create" />
    </div>
  )
}
