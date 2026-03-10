// lib/actions/lesson-comments-admin.ts
// 單元留言/評論 - 後台管理 Server Actions

'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/require-admin'

// requireAdminAuth 從 @/lib/require-admin 引入（直接查 DB 確保角色即時生效）

export type AdminLessonComment = {
  id: string
  content: string
  isAnonymous: boolean
  createdAt: Date
  deletedAt: Date | null
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  lesson: {
    id: string
    title: string
    chapter: {
      id: string
      title: string
      course: { id: string; title: string; slug: string }
    }
  }
}

export async function getLessonCommentsForAdminByLesson(
  lessonId: string
): Promise<AdminLessonComment[]> {
  await requireAdminAuth()

  return prisma.lessonComment.findMany({
    where: { lessonId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      lesson: {
        select: {
          id: true,
          title: true,
          chapter: {
            select: {
              id: true,
              title: true,
              course: { select: { id: true, title: true, slug: true } },
            },
          },
        },
      },
    },
  })
}

const ADMIN_COMMENTS_PAGE_SIZE = 50

export type AdminCommentsPage = {
  comments: AdminLessonComment[]
  nextCursor: string | null
  totalCount: number
}

export async function getAllLessonCommentsForAdmin(
  cursor?: string
): Promise<AdminCommentsPage> {
  await requireAdminAuth()

  const [comments, totalCount] = await Promise.all([
    prisma.lessonComment.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: ADMIN_COMMENTS_PAGE_SIZE,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        lesson: {
          select: {
            id: true,
            title: true,
            chapter: {
              select: {
                id: true,
                title: true,
                course: { select: { id: true, title: true, slug: true } },
              },
            },
          },
        },
      },
    }),
    prisma.lessonComment.count({ where: { deletedAt: null } }),
  ])

  const nextCursor =
    comments.length === ADMIN_COMMENTS_PAGE_SIZE
      ? comments[comments.length - 1].id
      : null

  return { comments, nextCursor, totalCount }
}

// 取得課程留言摘要（依單元分組）
export type LessonCommentSummary = {
  lessonId: string
  lessonTitle: string
  chapterTitle: string
  totalCount: number
  unreadCount: number
  latestComment: {
    content: string
    createdAt: Date
    userName: string | null
  } | null
}

export async function getCourseCommentSummaries(
  courseId: string
): Promise<LessonCommentSummary[]> {
  await requireAdminAuth()

  // 取得該課程所有章節與單元
  const chapters = await prisma.chapter.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        select: { id: true, title: true },
      },
    },
  })

  // 取得該課程所有未刪除留言（按單元分組統計）
  const comments = await prisma.lessonComment.findMany({
    where: {
      deletedAt: null,
      lesson: { chapter: { courseId } },
    },
    select: {
      lessonId: true,
      content: true,
      createdAt: true,
      isRead: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // 按 lessonId 分組
  const commentsByLesson = new Map<string, typeof comments>()
  for (const c of comments) {
    const list = commentsByLesson.get(c.lessonId) ?? []
    list.push(c)
    commentsByLesson.set(c.lessonId, list)
  }

  const summaries: LessonCommentSummary[] = []
  for (const chapter of chapters) {
    for (const lesson of chapter.lessons) {
      const lessonComments = commentsByLesson.get(lesson.id) ?? []
      if (lessonComments.length === 0) continue

      const latest = lessonComments[0] // 已按時間降序排列
      const unreadCount = lessonComments.filter((c) => !c.isRead).length

      summaries.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        chapterTitle: chapter.title,
        totalCount: lessonComments.length,
        unreadCount,
        latestComment: latest
          ? {
              content: latest.content,
              createdAt: latest.createdAt,
              userName: latest.user.name,
            }
          : null,
      })
    }
  }

  return summaries
}

// 標記單元留言為已讀
export async function markLessonCommentsAsRead(
  lessonId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminAuth()

    await prisma.lessonComment.updateMany({
      where: { lessonId, isRead: false, deletedAt: null },
      data: { isRead: true },
    })

    return { success: true }
  } catch (error) {
    console.error('標記已讀失敗:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '標記已讀失敗',
    }
  }
}

export async function deleteLessonCommentForAdmin(input: {
  commentId: string
  revalidate?: { path?: string; courseId?: string }
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAdminAuth()

    const existing = await prisma.lessonComment.findUnique({
      where: { id: input.commentId },
      select: { id: true, deletedAt: true, lessonId: true },
    })

    if (!existing) return { success: false, error: '留言不存在' }
    if (existing.deletedAt) return { success: true }

    await prisma.lessonComment.update({
      where: { id: input.commentId },
      data: {
        deletedAt: new Date(),
        deletedBy: user.id,
      },
    })

    if (input.revalidate?.path) revalidatePath(input.revalidate.path)
    if (input.revalidate?.courseId)
      revalidatePath(`/admin/courses/${input.revalidate.courseId}`)

    return { success: true }
  } catch (error) {
    console.error('刪除留言失敗:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '刪除留言失敗',
    }
  }
}

