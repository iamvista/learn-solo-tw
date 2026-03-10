// lib/actions/my-courses.ts
// 「我的課程」頁面 Server Actions
// 提供已購買課程查詢、進度統計和繼續學習功能

'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

/**
 * 課程進度統計
 */
export interface CourseProgressStats {
  totalLessons: number
  completedLessons: number
  progressPercentage: number
}

/**
 * 最後觀看的單元資訊
 */
export interface LastLessonInfo {
  id: string
  title: string
  chapterTitle: string
}

/**
 * 我的課程資料
 */
export interface MyCourse {
  id: string
  title: string
  slug: string
  coverImage: string | null
  progress: CourseProgressStats
  lastLesson: LastLessonInfo | null
  purchasedAt: Date
  isCompleted: boolean
}

/**
 * 繼續學習資料
 */
export interface ContinueLearningData {
  course: {
    id: string
    title: string
    slug: string
    coverImage: string | null
  }
  lesson: {
    id: string
    title: string
    chapterTitle: string
  }
  progress: CourseProgressStats
  lastWatchAt: Date
}

/**
 * 取得用戶已購買的所有課程（含進度）
 */
export async function getMyCourses(): Promise<MyCourse[]> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return []
    }

    const userId = session.user.id

    // 查詢有效的購買記錄
    const purchases = await prisma.purchase.findMany({
      where: {
        userId,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            status: true,
            chapters: {
              select: {
                id: true,
                title: true,
                lessons: {
                  select: {
                    id: true,
                    title: true,
                  },
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 過濾掉草稿課程
    const validPurchases = purchases.filter(
      (p) => p.course.status !== 'DRAFT'
    )

    // 取得所有課程的進度記錄
    const courseIds = validPurchases.map((p) => p.courseId)
    const allProgress = await prisma.lessonProgress.findMany({
      where: {
        userId,
        lesson: {
          chapter: {
            courseId: { in: courseIds },
          },
        },
      },
      select: {
        lessonId: true,
        completed: true,
        lastWatchAt: true,
        lesson: {
          select: {
            id: true,
            title: true,
            chapter: {
              select: {
                courseId: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: { lastWatchAt: 'desc' },
    })

    // 建立課程進度映射
    const progressByCoure = new Map<
      string,
      {
        completed: Set<string>
        lastProgress: (typeof allProgress)[0] | null
      }
    >()

    for (const progress of allProgress) {
      const courseId = progress.lesson.chapter.courseId
      if (!progressByCoure.has(courseId)) {
        progressByCoure.set(courseId, {
          completed: new Set(),
          lastProgress: progress,
        })
      }
      if (progress.completed) {
        progressByCoure.get(courseId)!.completed.add(progress.lessonId)
      }
    }

    // 組合課程資料
    const courses: MyCourse[] = validPurchases.map((purchase) => {
      const course = purchase.course
      const totalLessons = course.chapters.reduce(
        (sum, ch) => sum + ch.lessons.length,
        0
      )
      const progressData = progressByCoure.get(course.id)
      const completedLessons = progressData?.completed.size || 0
      const progressPercentage =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0

      // 找出最後觀看的單元
      let lastLesson: LastLessonInfo | null = null
      if (progressData?.lastProgress) {
        const lp = progressData.lastProgress
        lastLesson = {
          id: lp.lesson.id,
          title: lp.lesson.title,
          chapterTitle: lp.lesson.chapter.title,
        }
      }

      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        coverImage: course.coverImage,
        progress: {
          totalLessons,
          completedLessons,
          progressPercentage,
        },
        lastLesson,
        purchasedAt: purchase.createdAt,
        isCompleted: progressPercentage === 100,
      }
    })

    // 排序：最近觀看 > 進行中 > 已完成
    courses.sort((a, b) => {
      // 1. 進行中的課程優先（有進度但未完成）
      const aInProgress =
        a.progress.progressPercentage > 0 && !a.isCompleted
      const bInProgress =
        b.progress.progressPercentage > 0 && !b.isCompleted
      if (aInProgress && !bInProgress) return -1
      if (!aInProgress && bInProgress) return 1

      // 2. 未完成優先於已完成
      if (!a.isCompleted && b.isCompleted) return -1
      if (a.isCompleted && !b.isCompleted) return 1

      // 3. 按購買時間排序
      return b.purchasedAt.getTime() - a.purchasedAt.getTime()
    })

    return courses
  } catch (error) {
    console.error('取得我的課程失敗:', error)
    return []
  }
}

/**
 * 取得繼續學習資料
 * 返回最近觀看但未完成的單元
 */
export async function getContinueLearning(): Promise<ContinueLearningData | null> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return null
    }

    const userId = session.user.id

    // 查詢最近觀看的未完成單元
    const recentProgress = await prisma.lessonProgress.findFirst({
      where: {
        userId,
        completed: false,
        lesson: {
          chapter: {
            course: {
              status: { not: 'DRAFT' },
              purchases: {
                some: {
                  userId,
                  revokedAt: null,
                  OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                  ],
                },
              },
            },
          },
        },
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            chapter: {
              select: {
                title: true,
                courseId: true,
                course: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    coverImage: true,
                    chapters: {
                      select: {
                        lessons: {
                          select: { id: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { lastWatchAt: 'desc' },
    })

    // 如果沒有未完成的進度，找最近購買但未開始的課程的第一個單元
    if (!recentProgress) {
      const unstarted = await prisma.purchase.findFirst({
        where: {
          userId,
          revokedAt: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
          course: {
            status: { not: 'DRAFT' },
          },
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImage: true,
              chapters: {
                select: {
                  title: true,
                  lessons: {
                    select: { id: true, title: true },
                    orderBy: { order: 'asc' },
                    take: 1,
                  },
                },
                orderBy: { order: 'asc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (
        !unstarted ||
        !unstarted.course.chapters[0]?.lessons[0]
      ) {
        return null
      }

      const course = unstarted.course
      const firstChapter = course.chapters[0]
      const firstLesson = firstChapter.lessons[0]

      // 計算課程總單元數
      const totalLessons = await prisma.lesson.count({
        where: { chapter: { courseId: course.id } },
      })

      return {
        course: {
          id: course.id,
          title: course.title,
          slug: course.slug,
          coverImage: course.coverImage,
        },
        lesson: {
          id: firstLesson.id,
          title: firstLesson.title,
          chapterTitle: firstChapter.title,
        },
        progress: {
          totalLessons,
          completedLessons: 0,
          progressPercentage: 0,
        },
        lastWatchAt: unstarted.createdAt,
      }
    }

    // 計算課程進度
    const course = recentProgress.lesson.chapter.course
    const totalLessons = course.chapters.reduce(
      (sum, ch) => sum + ch.lessons.length,
      0
    )

    const completedCount = await prisma.lessonProgress.count({
      where: {
        userId,
        completed: true,
        lesson: {
          chapter: { courseId: course.id },
        },
      },
    })

    const progressPercentage =
      totalLessons > 0
        ? Math.round((completedCount / totalLessons) * 100)
        : 0

    return {
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        coverImage: course.coverImage,
      },
      lesson: {
        id: recentProgress.lesson.id,
        title: recentProgress.lesson.title,
        chapterTitle: recentProgress.lesson.chapter.title,
      },
      progress: {
        totalLessons,
        completedLessons: completedCount,
        progressPercentage,
      },
      lastWatchAt: recentProgress.lastWatchAt,
    }
  } catch (error) {
    console.error('取得繼續學習資料失敗:', error)
    return null
  }
}

/**
 * 取得課程的第一個單元 ID
 */
export async function getFirstLessonId(
  courseSlug: string
): Promise<string | null> {
  try {
    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
      select: {
        chapters: {
          select: {
            lessons: {
              select: { id: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
          orderBy: { order: 'asc' },
          take: 1,
        },
      },
    })

    return course?.chapters[0]?.lessons[0]?.id || null
  } catch (error) {
    console.error('取得第一個單元失敗:', error)
    return null
  }
}
