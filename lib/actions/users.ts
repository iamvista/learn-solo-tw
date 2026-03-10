// lib/actions/users.ts
// 用戶管理 Server Actions
// 提供用戶查詢、角色管理、課程授權操作

'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth, requireOnlyAdminAuth } from '@/lib/require-admin'
import {
  grantAccessSchema,
  revokeAccessSchema,
  updateRoleSchema,
  type GrantAccessData,
  type RevokeAccessData,
  type UpdateRoleData,
} from '@/lib/validations/user'
import type { UserRole, User, Purchase, Course } from '@prisma/client'

/**
 * 用戶列表查詢參數
 */
export interface GetUsersParams {
  search?: string
  hasPurchase?: 'all' | 'yes' | 'no'
  page?: number
  pageSize?: number
}

/**
 * 用戶資訊（含購買數量）
 */
export interface UserWithPurchaseCount extends User {
  _count: {
    purchases: number
  }
}

/**
 * 用戶列表回傳結果
 */
export interface GetUsersResult {
  users: UserWithPurchaseCount[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 用戶詳情（含購買記錄和學習進度）
 */
export interface UserDetail extends User {
  purchases: (Purchase & {
    course: Course
  })[]
  progress: {
    lessonId: string
    completed: boolean
    watchedSec: number
    lastWatchAt: Date
    lesson: {
      id: string
      title: string
      videoDuration: number | null
      chapter: {
        id: string
        title: string
        courseId: string
        course: {
          id: string
          title: string
        }
      }
    }
  }[]
}

/**
 * 管理員用戶資訊
 */
export interface AdminUser extends User {
  _count: {
    adminLogs: number
  }
}

/**
 * 課程進度統計
 */
export interface CourseProgress {
  courseId: string
  courseTitle: string
  totalLessons: number
  completedLessons: number
  totalDuration: number
  watchedDuration: number
  progressPercent: number
  lastWatchAt: Date | null
}

// requireAdminAuth, requireOnlyAdminAuth 從 @/lib/require-admin 引入（直接查 DB 確保角色即時生效）

/**
 * 記錄管理員操作日誌
 */
async function logAdminAction(
  adminId: string,
  action: 'GRANT_ACCESS' | 'REVOKE_ACCESS' | 'UPDATE_USER_ROLE',
  targetId: string,
  details?: Record<string, unknown>
) {
  try {
    await prisma.adminLog.create({
      data: {
        adminId,
        action,
        targetType: 'User',
        targetId,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      },
    })
  } catch (error) {
    console.error('記錄操作日誌失敗:', error)
  }
}

/**
 * 取得學員列表（排除 ADMIN 和 EDITOR）
 */
export async function getUsers(
  params: GetUsersParams = {}
): Promise<GetUsersResult> {
  await requireAdminAuth()

  const { search, hasPurchase = 'all', page = 1, pageSize = 20 } = params

  // 建立查詢條件
  const where: {
    role: UserRole
    OR?: { name?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' } }[]
    purchases?: { some?: object; none?: object }
  } = {
    role: 'USER',
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (hasPurchase === 'yes') {
    where.purchases = { some: {} }
  } else if (hasPurchase === 'no') {
    where.purchases = { none: {} }
  }

  // 查詢總數
  const total = await prisma.user.count({ where })

  // 查詢用戶列表
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      _count: {
        select: { purchases: true },
      },
    },
  })

  return {
    users,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * 取得單一用戶詳情
 */
export async function getUserById(id: string): Promise<UserDetail | null> {
  await requireAdminAuth()

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      purchases: {
        where: { revokedAt: null },
        include: {
          course: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      progress: {
        include: {
          lesson: {
            include: {
              chapter: {
                include: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { lastWatchAt: 'desc' },
      },
    },
  })

  return user as UserDetail | null
}

/**
 * 取得用戶學習進度（按課程統計）
 */
export async function getUserProgress(userId: string): Promise<CourseProgress[]> {
  await requireAdminAuth()

  // 取得用戶已購買的課程
  const purchases = await prisma.purchase.findMany({
    where: {
      userId,
      revokedAt: null,
    },
    include: {
      course: {
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
      },
    },
  })

  // 取得用戶的學習進度
  const progress = await prisma.lessonProgress.findMany({
    where: { userId },
  })

  // 建立進度查詢 Map
  const progressMap = new Map(
    progress.map((p) => [p.lessonId, p])
  )

  // 計算每個課程的進度
  const courseProgressList: CourseProgress[] = purchases.map((purchase) => {
    const course = purchase.course
    let totalLessons = 0
    let completedLessons = 0
    let totalDuration = 0
    let watchedDuration = 0
    let lastWatchAt: Date | null = null

    course.chapters.forEach((chapter) => {
      chapter.lessons.forEach((lesson) => {
        totalLessons++
        totalDuration += lesson.videoDuration ?? 0

        const lessonProgress = progressMap.get(lesson.id)
        if (lessonProgress) {
          if (lessonProgress.completed) {
            completedLessons++
          }
          watchedDuration += lessonProgress.watchedSec
          if (!lastWatchAt || lessonProgress.lastWatchAt > lastWatchAt) {
            lastWatchAt = lessonProgress.lastWatchAt
          }
        }
      })
    })

    const progressPercent = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0

    return {
      courseId: course.id,
      courseTitle: course.title,
      totalLessons,
      completedLessons,
      totalDuration,
      watchedDuration,
      progressPercent,
      lastWatchAt,
    }
  })

  return courseProgressList
}

/**
 * 取得管理員列表（ADMIN 和 EDITOR）
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  await requireOnlyAdminAuth()

  const admins = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'EDITOR'] },
    },
    orderBy: [
      { role: 'asc' },
      { createdAt: 'desc' },
    ],
    include: {
      _count: {
        select: { adminLogs: true },
      },
    },
  })

  return admins
}

/**
 * 更新用戶角色
 */
export async function updateUserRole(
  data: UpdateRoleData
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireOnlyAdminAuth()

    // 驗證資料
    const validatedData = updateRoleSchema.parse(data)

    // 檢查是否修改自己的角色
    if (validatedData.userId === currentUser.id) {
      return { success: false, error: '無法修改自己的角色' }
    }

    // 查詢目標用戶
    const targetUser = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    })

    if (!targetUser) {
      return { success: false, error: '用戶不存在' }
    }

    // 如果目標用戶是 ADMIN，檢查是否為最後一位管理員
    if (targetUser.role === 'ADMIN' && validatedData.role !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      })

      if (adminCount <= 1) {
        return { success: false, error: '必須保留至少一位管理員' }
      }
    }

    // 更新角色
    await prisma.user.update({
      where: { id: validatedData.userId },
      data: { role: validatedData.role },
    })

    // 記錄操作日誌
    await logAdminAction(
      currentUser.id as string,
      'UPDATE_USER_ROLE',
      validatedData.userId,
      {
        from: targetUser.role,
        to: validatedData.role,
      }
    )

    // 重新驗證頁面快取
    revalidatePath('/admin/users')
    revalidatePath('/admin/users/admins')
    revalidatePath(`/admin/users/${validatedData.userId}`)

    return { success: true }
  } catch (error) {
    console.error('更新用戶角色失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '更新角色時發生錯誤' }
  }
}

/**
 * 手動授權課程存取
 */
export async function grantCourseAccess(
  data: GrantAccessData
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireAdminAuth()

    // 驗證資料
    const validatedData = grantAccessSchema.parse(data)

    // 檢查用戶是否存在
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    })

    if (!user) {
      return { success: false, error: '用戶不存在' }
    }

    // 檢查課程是否存在
    const course = await prisma.course.findUnique({
      where: { id: validatedData.courseId },
    })

    if (!course) {
      return { success: false, error: '課程不存在' }
    }

    // 檢查是否已有授權記錄
    const existingPurchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: {
          userId: validatedData.userId,
          courseId: validatedData.courseId,
        },
      },
    })

    if (existingPurchase) {
      // 如果已有授權但被撤銷，則恢復授權
      if (existingPurchase.revokedAt) {
        await prisma.purchase.update({
          where: { id: existingPurchase.id },
          data: {
            revokedAt: null,
            grantedBy: currentUser.id as string,
            expiresAt: validatedData.expiresAt,
          },
        })
      } else {
        return { success: false, error: '用戶已擁有此課程的存取權限' }
      }
    } else {
      // 建立新的授權記錄
      await prisma.purchase.create({
        data: {
          userId: validatedData.userId,
          courseId: validatedData.courseId,
          grantedBy: currentUser.id as string,
          expiresAt: validatedData.expiresAt,
        },
      })
    }

    // 記錄操作日誌
    await logAdminAction(
      currentUser.id as string,
      'GRANT_ACCESS',
      validatedData.userId,
      {
        courseId: validatedData.courseId,
        courseTitle: course.title,
        expiresAt: validatedData.expiresAt,
      }
    )

    // 重新驗證頁面快取
    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${validatedData.userId}`)

    return { success: true }
  } catch (error) {
    console.error('授權課程存取失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '授權課程時發生錯誤' }
  }
}

/**
 * 撤銷課程存取權限
 */
export async function revokeCourseAccess(
  data: RevokeAccessData
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireAdminAuth()

    // 驗證資料
    const validatedData = revokeAccessSchema.parse(data)

    // 查詢授權記錄
    const purchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: {
          userId: validatedData.userId,
          courseId: validatedData.courseId,
        },
      },
      include: {
        course: true,
      },
    })

    if (!purchase) {
      return { success: false, error: '找不到授權記錄' }
    }

    if (purchase.revokedAt) {
      return { success: false, error: '此授權已被撤銷' }
    }

    // 撤銷授權
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { revokedAt: new Date() },
    })

    // 記錄操作日誌
    await logAdminAction(
      currentUser.id as string,
      'REVOKE_ACCESS',
      validatedData.userId,
      {
        courseId: validatedData.courseId,
        courseTitle: purchase.course.title,
      }
    )

    // 重新驗證頁面快取
    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${validatedData.userId}`)

    return { success: true }
  } catch (error) {
    console.error('撤銷課程存取失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '撤銷課程時發生錯誤' }
  }
}

/**
 * 匯出學員列表為 CSV（根據篩選條件，不分頁）
 */
export async function exportUsersCSV(
  params: Pick<GetUsersParams, 'search' | 'hasPurchase'>
): Promise<string> {
  await requireAdminAuth()

  const { search, hasPurchase = 'all' } = params

  // 建立查詢條件（與 getUsers 相同邏輯）
  const where: {
    role: UserRole
    OR?: { name?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' } }[]
    purchases?: { some?: object; none?: object }
  } = {
    role: 'USER',
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (hasPurchase === 'yes') {
    where.purchases = { some: {} }
  } else if (hasPurchase === 'no') {
    where.purchases = { none: {} }
  }

  // 查詢所有符合條件的用戶（含購買的課程名稱）
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      purchases: {
        where: { revokedAt: null },
        include: {
          course: { select: { title: true } },
        },
      },
    },
  })

  // CSV 欄位轉義（含公式注入防護）
  const escapeCsv = (value: string) => {
    let safe = value
    // 防止 CSV Injection：開頭為公式觸發字元時加上單引號前綴
    if (/^[=+\-@\t\r]/.test(safe)) {
      safe = `'${safe}`
    }
    if (safe.includes(',') || safe.includes('"') || safe.includes('\n') || safe !== value) {
      return `"${safe.replace(/"/g, '""')}"`
    }
    return safe
  }

  // 產生 CSV
  const header = '姓名,Email,電話,已購課程數,已購課程,註冊日期'
  const rows = users.map((user) => {
    const name = escapeCsv(user.name ?? '')
    const email = escapeCsv(user.email)
    const phone = user.phone ?? '-'
    const purchaseCount = user.purchases.length.toString()
    const courseNames = escapeCsv(
      user.purchases.map((p) => p.course.title).join(', ')
    )
    const createdAt = user.createdAt.toISOString().split('T')[0]

    return `${name},${email},${phone},${purchaseCount},${courseNames},${createdAt}`
  })

  return [header, ...rows].join('\n')
}

/**
 * 取得所有可授權的課程（用於授權對話框）
 */
export async function getAvailableCourses(): Promise<{ id: string; title: string }[]> {
  await requireAdminAuth()

  const courses = await prisma.course.findMany({
    where: {
      status: { in: ['PUBLISHED', 'UNLISTED'] },
    },
    select: {
      id: true,
      title: true,
    },
    orderBy: { title: 'asc' },
  })

  return courses
}
