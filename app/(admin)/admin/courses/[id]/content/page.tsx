// app/(admin)/admin/courses/[id]/content/page.tsx
// 課程內容頁面 - 三欄式佈局
// 左側: 大綱導覽 | 中間: 單元編輯器 | 右側: 設定與預覽

import { ContentLayout } from '@/components/admin/course-editor/content-layout'
import { OutlinePanel } from '@/components/admin/course-editor/outline-panel'
import { LessonEditorPanel } from '@/components/admin/course-editor/lesson-editor-panel'
import { SettingsPreviewPanel } from '@/components/admin/course-editor/settings-preview-panel'

export const metadata = {
  title: '課程內容',
}

interface ContentPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ContentPage({ params }: ContentPageProps) {
  const { id: courseId } = await params
  const streamCustomerCode = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE

  return (
    <ContentLayout
      leftPanel={<OutlinePanel courseId={courseId} />}
      centerPanel={<LessonEditorPanel streamCustomerCode={streamCustomerCode} />}
      rightPanel={
        <SettingsPreviewPanel streamCustomerCode={streamCustomerCode} />
      }
    />
  )
}
