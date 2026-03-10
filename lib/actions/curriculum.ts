// lib/actions/curriculum.ts
// 課程大綱管理 Server Actions
// 提供章節和單元的 CRUD 操作

'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/require-admin'
import {
  chapterSchema,
  lessonSchema,
  createChapterSchema,
  createLessonSchema,
  type ChapterFormData,
  type LessonFormData,
  type CreateChapterData,
  type CreateLessonData,
  type ChapterOrder,
  type LessonOrder,
} from '@/lib/validations/curriculum'
import type { Chapter, Lesson } from '@prisma/client'

/**
 * 課程大綱類型（包含章節和單元）
 */
export type ChapterWithLessons = Chapter & {
  lessons: Lesson[]
}

export type CourseCurriculum = {
  id: string
  title: string
  chapters: ChapterWithLessons[]
}

// requireAdminAuth 從 @/lib/require-admin 引入（直接查 DB 確保角色即時生效）

/**
 * 記錄管理員操作日誌
 */
async function logAdminAction(
  adminId: string,
  action: 'CREATE_LESSON' | 'UPDATE_LESSON' | 'DELETE_LESSON',
  targetId: string,
  details?: Record<string, unknown>
) {
  try {
    await prisma.adminLog.create({
      data: {
        adminId,
        action,
        targetType: 'Lesson',
        targetId,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      },
    })
  } catch (error) {
    console.error('記錄操作日誌失敗:', error)
  }
}

// ==================== 課程大綱 ====================

/**
 * 取得課程大綱（章節+單元）
 */
export async function getCourseCurriculum(
  courseId: string
): Promise<CourseCurriculum | null> {
  await requireAdminAuth()

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      chapters: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  })

  return course
}

// ==================== 章節操作 ====================

/**
 * 建立章節
 */
export async function createChapter(
  data: CreateChapterData
): Promise<{ success: boolean; chapter?: Chapter; error?: string }> {
  try {
    await requireAdminAuth()

    // 驗證資料
    const validatedData = createChapterSchema.parse(data)

    // 檢查課程是否存在
    const course = await prisma.course.findUnique({
      where: { id: validatedData.courseId },
    })

    if (!course) {
      return { success: false, error: '課程不存在' }
    }

    // 取得目前最大的 order
    const maxOrder = await prisma.chapter.aggregate({
      where: { courseId: validatedData.courseId },
      _max: { order: true },
    })

    const newOrder = (maxOrder._max.order ?? -1) + 1

    // 建立章節
    const chapter = await prisma.chapter.create({
      data: {
        courseId: validatedData.courseId,
        title: validatedData.title,
        order: newOrder,
      },
    })

    // 重新驗證頁面快取
    revalidatePath(`/admin/courses/${validatedData.courseId}/curriculum`)

    return { success: true, chapter }
  } catch (error) {
    console.error('建立章節失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '建立章節時發生錯誤' }
  }
}

/**
 * 更新章節
 */
export async function updateChapter(
  id: string,
  data: ChapterFormData
): Promise<{ success: boolean; chapter?: Chapter; error?: string }> {
  try {
    await requireAdminAuth()

    // 驗證資料
    const validatedData = chapterSchema.parse(data)

    // 檢查章節是否存在
    const existingChapter = await prisma.chapter.findUnique({
      where: { id },
    })

    if (!existingChapter) {
      return { success: false, error: '章節不存在' }
    }

    // 更新章節
    const chapter = await prisma.chapter.update({
      where: { id },
      data: {
        title: validatedData.title,
      },
    })

    // 重新驗證頁面快取
    revalidatePath(`/admin/courses/${existingChapter.courseId}/curriculum`)

    return { success: true, chapter }
  } catch (error) {
    console.error('更新章節失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '更新章節時發生錯誤' }
  }
}

/**
 * 刪除章節（連同單元）
 */
export async function deleteChapter(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminAuth()

    // 檢查章節是否存在
    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: { lessons: true },
    })

    if (!chapter) {
      return { success: false, error: '章節不存在' }
    }

    // 刪除章節（會連同刪除相關單元，因為設定了 onDelete: Cascade）
    await prisma.chapter.delete({
      where: { id },
    })

    // 重新驗證頁面快取
    revalidatePath(`/admin/courses/${chapter.courseId}/curriculum`)

    return { success: true }
  } catch (error) {
    console.error('刪除章節失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '刪除章節時發生錯誤' }
  }
}

/**
 * 重新排序章節
 */
export async function reorderChapters(
  courseId: string,
  orders: ChapterOrder[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminAuth()

    // 使用事務批量更新順序
    await prisma.$transaction(
      orders.map((item) =>
        prisma.chapter.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    )

    // 重新驗證頁面快取
    revalidatePath(`/admin/courses/${courseId}/curriculum`)

    return { success: true }
  } catch (error) {
    console.error('重新排序章節失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '重新排序章節時發生錯誤' }
  }
}

// ==================== 單元操作 ====================

/**
 * 取得單一單元
 */
export async function getLessonById(id: string): Promise<Lesson | null> {
  await requireAdminAuth()

  const lesson = await prisma.lesson.findUnique({
    where: { id },
  })

  return lesson
}

/**
 * 取得單元所屬的課程 ID
 */
export async function getLessonCourseId(
  lessonId: string
): Promise<string | null> {
  await requireAdminAuth()

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      chapter: {
        select: { courseId: true },
      },
    },
  })

  return lesson?.chapter.courseId ?? null
}

/**
 * 建立單元
 */
export async function createLesson(
  data: CreateLessonData
): Promise<{ success: boolean; lesson?: Lesson; error?: string }> {
  try {
    const user = await requireAdminAuth()

    // 驗證資料
    const validatedData = createLessonSchema.parse(data)

    // 檢查章節是否存在
    const chapter = await prisma.chapter.findUnique({
      where: { id: validatedData.chapterId },
    })

    if (!chapter) {
      return { success: false, error: '章節不存在' }
    }

    // 取得目前最大的 order
    const maxOrder = await prisma.lesson.aggregate({
      where: { chapterId: validatedData.chapterId },
      _max: { order: true },
    })

    const newOrder = (maxOrder._max.order ?? -1) + 1

    // 建立單元
    const lesson = await prisma.lesson.create({
      data: {
        chapterId: validatedData.chapterId,
        title: validatedData.title,
        content: validatedData.content ?? null,
        videoId: validatedData.videoId ?? null,
        videoDuration: validatedData.videoDuration ?? null,
        isFree: validatedData.isFree ?? false,
        order: newOrder,
        // 製作中設定
        status: validatedData.status ?? 'PUBLISHED',
        comingSoonTitle: validatedData.comingSoonTitle ?? null,
        comingSoonDescription: validatedData.comingSoonDescription ?? null,
        comingSoonImage: validatedData.comingSoonImage || null,
        comingSoonDate: validatedData.comingSoonDate ?? null,
      },
    })

    // 記錄操作日誌
    await logAdminAction(user.id as string, 'CREATE_LESSON', lesson.id, {
      title: lesson.title,
      chapterId: lesson.chapterId,
    })

    // 重新驗證頁面快取
    revalidatePath(`/admin/courses/${chapter.courseId}/curriculum`)

    return { success: true, lesson }
  } catch (error) {
    console.error('建立單元失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '建立單元時發生錯誤' }
  }
}

/**
 * 更新單元
 */
export async function updateLesson(
  id: string,
  data: LessonFormData
): Promise<{ success: boolean; lesson?: Lesson; error?: string }> {
  try {
    const user = await requireAdminAuth()

    // 驗證資料
    const validatedData = lessonSchema.parse(data)

    // 檢查單元是否存在
    const existingLesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        chapter: {
          select: { courseId: true },
        },
      },
    })

    if (!existingLesson) {
      return { success: false, error: '單元不存在' }
    }

    // 更新單元
    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        title: validatedData.title,
        content: validatedData.content ?? null,
        videoId: validatedData.videoId ?? null,
        videoDuration: validatedData.videoDuration ?? null,
        isFree: validatedData.isFree ?? false,
        // 製作中設定
        status: validatedData.status ?? 'PUBLISHED',
        comingSoonTitle: validatedData.comingSoonTitle ?? null,
        comingSoonDescription: validatedData.comingSoonDescription ?? null,
        comingSoonImage: validatedData.comingSoonImage || null,
        comingSoonDate: validatedData.comingSoonDate ?? null,
      },
    })

    // 記錄操作日誌
    await logAdminAction(user.id as string, 'UPDATE_LESSON', lesson.id, {
      title: lesson.title,
      changes: {
        before: existingLesson.title,
        after: lesson.title,
      },
    })

    // 重新驗證頁面快取
    revalidatePath(`/admin/courses/${existingLesson.chapter.courseId}/curriculum`)
    revalidatePath(
      `/admin/courses/${existingLesson.chapter.courseId}/curriculum/lessons/${id}`
    )

    return { success: true, lesson }
  } catch (error) {
    console.error('更新單元失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '更新單元時發生錯誤' }
  }
}

/**
 * 刪除單元
 */
export async function deleteLesson(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAdminAuth()

    // 檢查單元是否存在
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        chapter: {
          select: { courseId: true },
        },
      },
    })

    if (!lesson) {
      return { success: false, error: '單元不存在' }
    }

    // 刪除單元
    await prisma.lesson.delete({
      where: { id },
    })

    // 記錄操作日誌
    await logAdminAction(user.id as string, 'DELETE_LESSON', id, {
      title: lesson.title,
      chapterId: lesson.chapterId,
    })

    // 重新驗證頁面快取
    revalidatePath(`/admin/courses/${lesson.chapter.courseId}/curriculum`)

    return { success: true }
  } catch (error) {
    console.error('刪除單元失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '刪除單元時發生錯誤' }
  }
}

/**
 * 重新排序單元
 */
export async function reorderLessons(
  chapterId: string,
  orders: LessonOrder[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminAuth()

    // 取得章節的課程 ID
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { courseId: true },
    })

    if (!chapter) {
      return { success: false, error: '章節不存在' }
    }

    // 使用事務批量更新順序
    await prisma.$transaction(
      orders.map((item) =>
        prisma.lesson.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    )

    // 重新驗證頁面快取
    revalidatePath(`/admin/courses/${chapter.courseId}/curriculum`)

    return { success: true }
  } catch (error) {
    console.error('重新排序單元失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '重新排序單元時發生錯誤' }
  }
}

/**
 * 切換試閱狀態
 */
export async function toggleLessonFree(
  id: string
): Promise<{ success: boolean; lesson?: Lesson; error?: string }> {
  try {
    const user = await requireAdminAuth()

    // 取得單元
    const existingLesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        chapter: {
          select: { courseId: true },
        },
      },
    })

    if (!existingLesson) {
      return { success: false, error: '單元不存在' }
    }

    // 切換試閱狀態
    const lesson = await prisma.lesson.update({
      where: { id },
      data: { isFree: !existingLesson.isFree },
    })

    // 記錄操作日誌
    await logAdminAction(user.id as string, 'UPDATE_LESSON', id, {
      action: 'toggle_free',
      from: existingLesson.isFree,
      to: lesson.isFree,
    })

    // 重新驗證頁面快取
    revalidatePath(`/admin/courses/${existingLesson.chapter.courseId}/curriculum`)

    return { success: true, lesson }
  } catch (error) {
    console.error('切換試閱狀態失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '切換試閱狀態時發生錯誤' }
  }
}
