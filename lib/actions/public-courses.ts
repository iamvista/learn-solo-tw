// lib/actions/public-courses.ts
// 前臺課程相關 Server Actions
// 提供公開課程列表查詢功能

'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

/**
 * 已發佈課程資料型別
 */
export interface PublishedCourse {
  id: string
  title: string
  subtitle: string | null
  slug: string
  description: string | null
  coverImage: string | null
  price: number
  salePrice: number | null
  saleEndAt: Date | null
  saleLabel: string | null
  saleCycleEnabled: boolean
  saleCycleDays: number | null
  chapterCount: number
  lessonCount: number
  totalDuration: number // 總時長（秒）
}

/**
 * 課程單元資料型別
 */
export type LessonStatusType = 'PUBLISHED' | 'COMING_SOON'

export interface CourseLesson {
  id: string
  title: string
  videoDuration: number | null
  isFree: boolean
  order: number
  status: LessonStatusType
}

/**
 * 課程章節資料型別（含單元列表）
 */
export interface CourseChapter {
  id: string
  title: string
  order: number
  lessons: CourseLesson[]
}

/**
 * 課程詳情資料型別（含章節和單元）
 */
export interface CourseDetail {
  id: string
  title: string
  subtitle: string | null
  slug: string
  description: string | null
  coverImage: string | null
  price: number
  salePrice: number | null
  saleEndAt: Date | null
  saleLabel: string | null
  saleCycleEnabled: boolean
  saleCycleDays: number | null
  showCountdown: boolean
  chapters: CourseChapter[]
  lessonCount: number
  totalDuration: number // 總時長（秒）
  seoTitle: string | null
  seoDesc: string | null
  seoKeywords: string | null
  // OG / Social
  ogDescription: string | null
  ogImage: string | null
  // 銷售頁設定
  landingPageMode: string | null
  landingPageSlug: string | null
  landingPageHtml: string | null
  // JSON-LD 結構化資料
  instructorName: string | null
  instructorTitle: string | null
  instructorDesc: string | null
  courseWorkload: string | null
  ratingValue: string | null
  ratingCount: string | null
  // 評價設定
  enableReviews: boolean
  showReviews: boolean
}

/**
 * 根據 slug 取得課程詳情
 * 包含章節列表、單元列表和總時長統計
 * 只返回已發佈或隱藏的課程
 */
export async function getCourseBySlug(
  slug: string
): Promise<CourseDetail | null> {
  const course = await prisma.course.findFirst({
    where: {
      slug,
      status: {
        in: ['PUBLISHED', 'UNLISTED'],
      },
    },
    include: {
      chapters: {
        orderBy: {
          order: 'asc',
        },
        include: {
          lessons: {
            orderBy: {
              order: 'asc',
            },
            select: {
              id: true,
              title: true,
              videoDuration: true,
              isFree: true,
              order: true,
              status: true,
            },
          },
        },
      },
    },
  })

  if (!course) {
    return null
  }

  // 計算總時長和總單元數
  let totalDuration = 0
  let lessonCount = 0

  const chapters: CourseChapter[] = course.chapters.map((chapter) => {
    const lessons: CourseLesson[] = chapter.lessons.map((lesson) => {
      if (lesson.videoDuration) {
        totalDuration += lesson.videoDuration
      }
      lessonCount++
      return {
        id: lesson.id,
        title: lesson.title,
        videoDuration: lesson.videoDuration,
        isFree: lesson.isFree,
        order: lesson.order,
        status: lesson.status as LessonStatusType,
      }
    })

    return {
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      lessons,
    }
  })

  return {
    id: course.id,
    title: course.title,
    subtitle: course.subtitle,
    slug: course.slug,
    description: course.description,
    coverImage: course.coverImage,
    price: course.price,
    salePrice: course.salePrice,
    saleEndAt: course.saleEndAt,
    saleLabel: course.saleLabel,
    saleCycleEnabled: course.saleCycleEnabled,
    saleCycleDays: course.saleCycleDays,
    showCountdown: course.showCountdown,
    chapters,
    lessonCount,
    totalDuration,
    seoTitle: course.seoTitle,
    seoDesc: course.seoDesc,
    seoKeywords: course.seoKeywords,
    ogDescription: course.ogDescription,
    ogImage: course.ogImage,
    landingPageMode: course.landingPageMode,
    landingPageSlug: course.landingPageSlug,
    landingPageHtml: course.landingPageHtml,
    instructorName: course.instructorName,
    instructorTitle: course.instructorTitle,
    instructorDesc: course.instructorDesc,
    courseWorkload: course.courseWorkload,
    ratingValue: course.ratingValue,
    ratingCount: course.ratingCount,
    enableReviews: course.enableReviews,
    showReviews: course.showReviews,
  }
}

/**
 * 取得所有已發佈的課程列表
 * 只返回 status === 'PUBLISHED' 的課程
 * 包含章節數和單元數統計
 */
export async function getPublishedCourses(): Promise<PublishedCourse[]> {
  const courses = await prisma.course.findMany({
    where: {
      status: 'PUBLISHED',
    },
    include: {
      chapters: {
        include: {
          lessons: {
            select: {
              id: true,
              videoDuration: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // 轉換資料結構，計算章節數和單元數
  return courses.map((course) => {
    const chapterCount = course.chapters.length
    const lessonCount = course.chapters.reduce(
      (total, chapter) => total + chapter.lessons.length,
      0
    )
    const totalDuration = course.chapters.reduce(
      (total, chapter) =>
        total +
        chapter.lessons.reduce(
          (sum, lesson) => sum + (lesson.videoDuration ?? 0),
          0
        ),
      0
    )

    return {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      slug: course.slug,
      description: course.description,
      coverImage: course.coverImage,
      price: course.price,
      salePrice: course.salePrice,
      saleEndAt: course.saleEndAt,
      saleLabel: course.saleLabel,
      saleCycleEnabled: course.saleCycleEnabled,
      saleCycleDays: course.saleCycleDays,
      chapterCount,
      lessonCount,
      totalDuration,
    }
  })
}

/**
 * 購買狀態資料
 */
export interface PurchaseStatus {
  isPurchased: boolean
  firstLessonId: string | null
}

/**
 * 檢查用戶是否已購買指定課程
 * 返回購買狀態和第一個單元 ID（用於「進入課程」按鈕）
 */
export async function checkCoursePurchased(
  courseId: string
): Promise<PurchaseStatus> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { isPurchased: false, firstLessonId: null }
    }

    // 查詢有效的購買記錄
    const purchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    })

    // 檢查購買是否有效（未撤銷、未過期）
    const isPurchased =
      purchase !== null &&
      purchase.revokedAt === null &&
      (!purchase.expiresAt || purchase.expiresAt > new Date())

    // 如果已購買，取得第一個單元 ID
    let firstLessonId: string | null = null
    if (isPurchased) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
          chapters: {
            orderBy: { order: 'asc' },
            take: 1,
            select: {
              lessons: {
                orderBy: { order: 'asc' },
                take: 1,
                select: { id: true },
              },
            },
          },
        },
      })
      firstLessonId = course?.chapters[0]?.lessons[0]?.id || null
    }

    return { isPurchased, firstLessonId }
  } catch (error) {
    console.error('檢查購買狀態失敗:', error)
    return { isPurchased: false, firstLessonId: null }
  }
}
