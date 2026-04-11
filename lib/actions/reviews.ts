// lib/actions/reviews.ts
// 課程評價 Server Actions（前台）

'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import {
  createReviewSchema,
  updateReviewSchema,
  reportReviewSchema,
  type ReviewStats,
  type ReviewData,
  type UserReview,
  type ReviewSortBy,
} from '@/lib/validations/review'

/**
 * 取得課程評價統計
 */
export async function getReviewStats(
  courseId: string
): Promise<ReviewStats> {
  const reviews = await prisma.courseReview.findMany({
    where: { courseId, isVisible: true },
    select: { rating: true },
  })

  const reviewCount = reviews.length
  const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let totalRating = 0

  for (const review of reviews) {
    totalRating += review.rating
    distribution[review.rating] = (distribution[review.rating] || 0) + 1
  }

  const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0

  return {
    averageRating: Math.round(averageRating * 10) / 10,
    reviewCount,
    distribution,
  }
}

/**
 * 取得課程的評價列表（前台，只顯示可見的，支援排序和分頁）
 */
export async function getReviews(
  courseId: string,
  options?: {
    sortBy?: ReviewSortBy
    page?: number
    limit?: number
  }
): Promise<{ reviews: ReviewData[]; hasMore: boolean }> {
  const session = await auth()
  const currentUserId = session?.user?.id || null

  const sortBy = options?.sortBy || 'helpful'
  const page = options?.page || 1
  const limit = options?.limit || 10

  // 排序映射
  const orderBy = (() => {
    switch (sortBy) {
      case 'helpful':
        return [{ helpfulCount: 'desc' as const }, { createdAt: 'desc' as const }]
      case 'newest':
        return [{ createdAt: 'desc' as const }]
      case 'highest':
        return [{ rating: 'desc' as const }, { createdAt: 'desc' as const }]
      case 'lowest':
        return [{ rating: 'asc' as const }, { createdAt: 'desc' as const }]
      default:
        return [{ helpfulCount: 'desc' as const }, { createdAt: 'desc' as const }]
    }
  })()

  const reviews = await prisma.courseReview.findMany({
    where: { courseId, isVisible: true },
    select: {
      id: true,
      rating: true,
      content: true,
      helpfulCount: true,
      replyContent: true,
      replyAt: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      helpfuls: currentUserId
        ? { where: { userId: currentUserId }, select: { id: true } }
        : false,
      reports: currentUserId
        ? { where: { userId: currentUserId }, select: { id: true } }
        : false,
    },
    orderBy,
    skip: (page - 1) * limit,
    take: limit + 1, // 多取一筆判斷是否有更多
  })

  const hasMore = reviews.length > limit
  const sliced = hasMore ? reviews.slice(0, limit) : reviews

  return {
    reviews: sliced.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      helpfulCount: r.helpfulCount,
      isHelpful: Array.isArray(r.helpfuls) ? r.helpfuls.length > 0 : false,
      hasReported: Array.isArray(r.reports) ? r.reports.length > 0 : false,
      replyContent: r.replyContent,
      replyAt: r.replyAt?.toISOString() || null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      user: r.user,
    })),
    hasMore,
  }
}

/**
 * 取得當前用戶對指定課程的評價
 */
export async function getUserReview(
  courseId: string
): Promise<UserReview | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const review = await prisma.courseReview.findUnique({
    where: {
      userId_courseId: {
        userId: session.user.id,
        courseId,
      },
    },
    select: {
      id: true,
      rating: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!review) return null

  return {
    ...review,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  }
}

/**
 * 建立評價
 */
export async function createReview(input: {
  courseId: string
  rating: number
  content?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: '請先登入' }
    }

    const parsed = createReviewSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || '輸入格式錯誤' }
    }

    const { courseId, rating, content } = parsed.data
    const userId = session.user.id

    // 檢查課程是否啟用評價功能
    const courseSettings = await prisma.course.findUnique({
      where: { id: courseId },
      select: { enableReviews: true },
    })
    if (!courseSettings?.enableReviews) {
      return { success: false, error: '此課程尚未開放評價功能' }
    }

    // 檢查用戶是否已購買該課程
    const purchase = await prisma.purchase.findUnique({
      where: { userId_courseId: { userId, courseId } },
    })

    if (
      !purchase ||
      purchase.revokedAt !== null ||
      (purchase.expiresAt && purchase.expiresAt <= new Date())
    ) {
      return { success: false, error: '您尚未購買此課程' }
    }

    // 檢查是否已有評價
    const existing = await prisma.courseReview.findUnique({
      where: { userId_courseId: { userId, courseId } },
    })

    if (existing) {
      return { success: false, error: '您已經評價過此課程，請使用編輯功能' }
    }

    // 建立評價
    await prisma.courseReview.create({
      data: { courseId, userId, rating, content },
    })

    // 更新課程的 ratingValue 和 ratingCount
    await syncCourseRating(courseId)

    // 取得課程 slug 用於 revalidate
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { slug: true },
    })
    if (course) {
      revalidatePath(`/courses/${course.slug}`)
    }
    revalidatePath('/my-courses')

    return { success: true }
  } catch (error) {
    console.error('建立評價失敗:', error)
    return { success: false, error: '建立評價失敗，請稍後再試' }
  }
}

/**
 * 編輯評價
 */
export async function updateReview(input: {
  reviewId: string
  rating: number
  content?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: '請先登入' }
    }

    const parsed = updateReviewSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || '輸入格式錯誤' }
    }

    const { reviewId, rating, content } = parsed.data

    // 確認評價存在且屬於當前用戶
    const review = await prisma.courseReview.findUnique({
      where: { id: reviewId },
      select: { userId: true, courseId: true },
    })

    if (!review) {
      return { success: false, error: '評價不存在' }
    }

    if (review.userId !== session.user.id) {
      return { success: false, error: '您只能編輯自己的評價' }
    }

    // 檢查課程是否啟用評價功能
    const courseSettings = await prisma.course.findUnique({
      where: { id: review.courseId },
      select: { enableReviews: true },
    })
    if (!courseSettings?.enableReviews) {
      return { success: false, error: '此課程尚未開放評價功能' }
    }

    // 驗證用戶仍擁有有效購買
    const purchase = await prisma.purchase.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId: review.courseId } },
    })

    if (
      !purchase ||
      purchase.revokedAt !== null ||
      (purchase.expiresAt && purchase.expiresAt <= new Date())
    ) {
      return { success: false, error: '您的課程權限已失效' }
    }

    await prisma.courseReview.update({
      where: { id: reviewId },
      data: { rating, content },
    })

    // 更新課程的 ratingValue 和 ratingCount
    await syncCourseRating(review.courseId)

    const course = await prisma.course.findUnique({
      where: { id: review.courseId },
      select: { slug: true },
    })
    if (course) {
      revalidatePath(`/courses/${course.slug}`)
    }
    revalidatePath('/my-courses')

    return { success: true }
  } catch (error) {
    console.error('更新評價失敗:', error)
    return { success: false, error: '更新評價失敗，請稍後再試' }
  }
}

/**
 * 切換「有用」投票
 */
export async function toggleHelpful(
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: '請先登入' }
    }

    const userId = session.user.id

    const existing = await prisma.reviewHelpful.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
    })

    if (existing) {
      // 取消有用
      await prisma.$transaction([
        prisma.reviewHelpful.delete({ where: { id: existing.id } }),
        prisma.courseReview.update({
          where: { id: reviewId },
          data: { helpfulCount: { decrement: 1 } },
        }),
      ])
    } else {
      // 標記有用
      await prisma.$transaction([
        prisma.reviewHelpful.create({ data: { reviewId, userId } }),
        prisma.courseReview.update({
          where: { id: reviewId },
          data: { helpfulCount: { increment: 1 } },
        }),
      ])
    }

    return { success: true }
  } catch (error) {
    console.error('切換有用失敗:', error)
    return { success: false, error: '操作失敗' }
  }
}

/**
 * 舉報評價
 */
export async function reportReview(input: {
  reviewId: string
  reason: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: '請先登入' }
    }

    const parsed = reportReviewSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || '輸入格式錯誤' }
    }

    const { reviewId, reason } = parsed.data
    const userId = session.user.id

    // 檢查是否已舉報過
    const existing = await prisma.reviewReport.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
    })

    if (existing) {
      return { success: false, error: '您已經舉報過此評價' }
    }

    await prisma.reviewReport.create({
      data: { reviewId, userId, reason },
    })

    return { success: true }
  } catch (error) {
    console.error('舉報評價失敗:', error)
    return { success: false, error: '舉報失敗，請稍後再試' }
  }
}

/**
 * 同步課程的 ratingValue 和 ratingCount（供 JSON-LD 使用）
 */
async function syncCourseRating(courseId: string): Promise<void> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { showReviews: true },
  })

  if (!course?.showReviews) return

  const stats = await getReviewStats(courseId)

  await prisma.course.update({
    where: { id: courseId },
    data: {
      ratingValue: stats.reviewCount > 0 ? stats.averageRating.toString() : null,
      ratingCount: stats.reviewCount > 0 ? stats.reviewCount.toString() : null,
    },
  })
}
