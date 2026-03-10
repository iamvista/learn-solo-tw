// app/(admin)/admin/courses/[id]/info/page.tsx
// 課程資訊頁面
// 暫時顯示基本的課程表單，未來會改為三欄式佈局

import { notFound } from 'next/navigation'
import { getCourseById } from '@/lib/actions/courses'
import { CourseForm } from '@/components/admin/courses/course-form'

export const metadata = {
  title: '課程資訊',
}

interface InfoPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function InfoPage({ params }: InfoPageProps) {
  const { id } = await params

  // 取得課程資料
  const course = await getCourseById(id)

  // 如果課程不存在，顯示 404
  if (!course) {
    notFound()
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <CourseForm mode="edit" course={course} />
    </div>
  )
}
