// app/(admin)/admin/comments/page.tsx
// 完整留言頁面：一覽所有課程/章節/單元留言

import { getAllLessonCommentsForAdmin } from '@/lib/actions/lesson-comments-admin'
import { AllCommentsTable } from '@/components/admin/comments/all-comments-table'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '留言管理',
}

function serializeComment(c: {
  id: string
  content: string
  isAnonymous: boolean
  createdAt: Date
  deletedAt: Date | null
  user: { id: string; name: string | null; email: string; image: string | null }
  lesson: {
    id: string
    title: string
    chapter: {
      id: string
      title: string
      course: { id: string; title: string; slug: string }
    }
  }
}) {
  return {
    id: c.id,
    content: c.content,
    isAnonymous: c.isAnonymous,
    createdAt: c.createdAt.toISOString(),
    deletedAt: c.deletedAt ? c.deletedAt.toISOString() : null,
    user: c.user,
    lesson: c.lesson,
  }
}

export default async function AdminCommentsPage() {
  const page = await getAllLessonCommentsForAdmin()

  return (
    <div className="p-4">
      <AllCommentsTable
        initialComments={page.comments.map(serializeComment)}
        initialNextCursor={page.nextCursor}
        initialTotalCount={page.totalCount}
      />
    </div>
  )
}

