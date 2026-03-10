// lib/actions/courses.ts
// 課程管理 Server Actions
// 提供課程 CRUD 操作

'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/require-admin'
import { courseSchema, type CourseFormData } from '@/lib/validations/course'
import { syncCourseToStripe } from '@/lib/stripe'
import { getActiveGatewayType } from '@/lib/payment/gateway-factory'
import type { CourseStatus, Course } from '@prisma/client'

/**
 * 課程列表查詢參數
 */
export interface GetCoursesParams {
  search?: string
  status?: CourseStatus | 'ALL'
  page?: number
  pageSize?: number
}

/**
 * 課程列表回傳結果
 */
export interface GetCoursesResult {
  courses: Course[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// requireAdminAuth 從 @/lib/require-admin 引入（直接查 DB 確保角色即時生效）

/**
 * 記錄管理員操作日誌
 */
async function logAdminAction(
  adminId: string,
  action: 'CREATE_COURSE' | 'UPDATE_COURSE' | 'DELETE_COURSE',
  targetId: string,
  details?: Record<string, unknown>
) {
  try {
    await prisma.adminLog.create({
      data: {
        adminId,
        action,
        targetType: 'Course',
        targetId,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      },
    })
  } catch (error) {
    console.error('記錄操作日誌失敗:', error)
  }
}

/**
 * 取得課程列表（含搜尋、篩選、分頁）
 */
export async function getCourses(
  params: GetCoursesParams = {}
): Promise<GetCoursesResult> {
  await requireAdminAuth()

  const { search, status, page = 1, pageSize = 10 } = params

  // 建立查詢條件
  const where: {
    title?: { contains: string; mode: 'insensitive' }
    status?: CourseStatus
  } = {}

  if (search) {
    where.title = {
      contains: search,
      mode: 'insensitive',
    }
  }

  if (status && status !== 'ALL') {
    where.status = status
  }

  // 查詢總數
  const total = await prisma.course.count({ where })

  // 查詢課程列表
  const courses = await prisma.course.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return {
    courses,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * 取得單一課程
 */
export async function getCourseById(id: string): Promise<Course | null> {
  await requireAdminAuth()

  const course = await prisma.course.findUnique({
    where: { id },
  })

  return course
}

/**
 * 建立課程
 */
export async function createCourse(
  data: CourseFormData
): Promise<{ success: boolean; course?: Course; error?: string }> {
  try {
    const user = await requireAdminAuth()

    // 驗證資料
    const validatedData = courseSchema.parse(data)

    // 檢查 slug 是否已存在
    const existingCourse = await prisma.course.findUnique({
      where: { slug: validatedData.slug },
    })

    if (existingCourse) {
      return {
        success: false,
        error: '此 Slug 已被使用，請更換其他 Slug',
      }
    }

    // 建立課程
    const course = await prisma.course.create({
      data: {
        title: validatedData.title,
        subtitle: validatedData.subtitle ?? null,
        slug: validatedData.slug,
        description: validatedData.description ?? null,
        coverImage: validatedData.coverImage || null,
        price: validatedData.price,
        salePrice: validatedData.salePrice ?? null,
        saleEndAt: validatedData.saleEndAt ?? null,
        saleLabel: validatedData.saleLabel ?? null,
        saleCycleEnabled: validatedData.saleCycleEnabled ?? false,
        saleCycleDays: validatedData.saleCycleDays ?? null,
        showCountdown: validatedData.showCountdown ?? true,
        seoTitle: validatedData.seoTitle ?? null,
        seoDesc: validatedData.seoDesc ?? null,
        seoKeywords: validatedData.seoKeywords ?? null,
        ogDescription: validatedData.ogDescription ?? null,
        ogImage: validatedData.ogImage || null,
        landingPageMode: validatedData.landingPageMode ?? null,
        landingPageSlug: validatedData.landingPageSlug ?? null,
        landingPageHtml: validatedData.landingPageHtml ?? null,
        instructorName: validatedData.instructorName ?? null,
        instructorTitle: validatedData.instructorTitle ?? null,
        instructorDesc: validatedData.instructorDesc ?? null,
        courseWorkload: validatedData.courseWorkload ?? null,
        ratingValue: validatedData.ratingValue ?? null,
        ratingCount: validatedData.ratingCount ?? null,
        notifyAdminOnPurchase: validatedData.notifyAdminOnPurchase ?? false,
        status: validatedData.status,
      },
    })

    // 同步到 Stripe（建立 Product + Price）- 僅在 Stripe 模式下執行
    const activeGateway = await getActiveGatewayType()
    if (activeGateway === 'stripe') {
      try {
        const stripeResult = await syncCourseToStripe({
          id: course.id,
          title: course.title,
          subtitle: course.subtitle,
          coverImage: course.coverImage,
          price: course.price,
          salePrice: course.salePrice,
        })

        if (stripeResult.stripeProductId) {
          await prisma.course.update({
            where: { id: course.id },
            data: {
              stripeProductId: stripeResult.stripeProductId,
              stripePriceId: stripeResult.stripePriceId,
              stripeSalePriceId: stripeResult.stripeSalePriceId,
            },
          })
        }
      } catch (stripeError) {
        console.error('[Stripe] 建立課程時同步失敗:', stripeError)
      }
    }

    // 記錄操作日誌
    await logAdminAction(user.id as string, 'CREATE_COURSE', course.id, {
      title: course.title,
      slug: course.slug,
    })

    // 重新驗證頁面快取
    revalidatePath('/admin/courses')
    revalidatePath('/admin')

    return { success: true, course }
  } catch (error) {
    console.error('建立課程失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '建立課程時發生錯誤' }
  }
}

/**
 * 更新課程
 */
export async function updateCourse(
  id: string,
  data: CourseFormData
): Promise<{ success: boolean; course?: Course; error?: string }> {
  try {
    const user = await requireAdminAuth()

    // 驗證資料
    const validatedData = courseSchema.parse(data)

    // 檢查課程是否存在
    const existingCourse = await prisma.course.findUnique({
      where: { id },
    })

    if (!existingCourse) {
      return { success: false, error: '課程不存在' }
    }

    // 檢查 slug 是否與其他課程重複
    const slugConflict = await prisma.course.findFirst({
      where: {
        slug: validatedData.slug,
        id: { not: id },
      },
    })

    if (slugConflict) {
      return {
        success: false,
        error: '此 Slug 已被其他課程使用',
      }
    }

    // 更新課程
    const course = await prisma.course.update({
      where: { id },
      data: {
        title: validatedData.title,
        subtitle: validatedData.subtitle ?? null,
        slug: validatedData.slug,
        description: validatedData.description ?? null,
        coverImage: validatedData.coverImage || null,
        price: validatedData.price,
        salePrice: validatedData.salePrice ?? null,
        saleEndAt: validatedData.saleEndAt ?? null,
        saleLabel: validatedData.saleLabel ?? null,
        saleCycleEnabled: validatedData.saleCycleEnabled ?? false,
        saleCycleDays: validatedData.saleCycleDays ?? null,
        showCountdown: validatedData.showCountdown ?? true,
        seoTitle: validatedData.seoTitle ?? null,
        seoDesc: validatedData.seoDesc ?? null,
        seoKeywords: validatedData.seoKeywords ?? null,
        ogDescription: validatedData.ogDescription ?? null,
        ogImage: validatedData.ogImage || null,
        landingPageMode: validatedData.landingPageMode ?? null,
        landingPageSlug: validatedData.landingPageSlug ?? null,
        landingPageHtml: validatedData.landingPageHtml ?? null,
        instructorName: validatedData.instructorName ?? null,
        instructorTitle: validatedData.instructorTitle ?? null,
        instructorDesc: validatedData.instructorDesc ?? null,
        courseWorkload: validatedData.courseWorkload ?? null,
        ratingValue: validatedData.ratingValue ?? null,
        ratingCount: validatedData.ratingCount ?? null,
        notifyAdminOnPurchase: validatedData.notifyAdminOnPurchase ?? false,
        status: validatedData.status,
      },
    })

    // 同步到 Stripe（更新 Product / 重建 Price）- 僅在 Stripe 模式下執行
    const updateGateway = await getActiveGatewayType()
    if (updateGateway === 'stripe') {
      try {
        const stripeResult = await syncCourseToStripe({
          id: course.id,
          title: course.title,
          subtitle: course.subtitle,
          coverImage: course.coverImage,
          price: course.price,
          salePrice: course.salePrice,
          stripeProductId: existingCourse.stripeProductId,
          stripePriceId: existingCourse.stripePriceId,
          stripeSalePriceId: existingCourse.stripeSalePriceId,
        })

        const needsUpdate =
          stripeResult.stripeProductId !== existingCourse.stripeProductId ||
          stripeResult.stripePriceId !== existingCourse.stripePriceId ||
          stripeResult.stripeSalePriceId !== existingCourse.stripeSalePriceId

        if (needsUpdate) {
          await prisma.course.update({
            where: { id: course.id },
            data: {
              stripeProductId: stripeResult.stripeProductId,
              stripePriceId: stripeResult.stripePriceId,
              stripeSalePriceId: stripeResult.stripeSalePriceId,
            },
          })
        }
      } catch (stripeError) {
        console.error('[Stripe] 更新課程時同步失敗:', stripeError)
      }
    }

    // 記錄操作日誌
    await logAdminAction(user.id as string, 'UPDATE_COURSE', course.id, {
      title: course.title,
      changes: {
        before: existingCourse.title,
        after: course.title,
      },
    })

    // 重新驗證頁面快取
    revalidatePath('/admin/courses')
    revalidatePath(`/admin/courses/${id}`)
    revalidatePath('/admin')

    return { success: true, course }
  } catch (error) {
    console.error('更新課程失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '更新課程時發生錯誤' }
  }
}

/**
 * 刪除課程
 */
export async function deleteCourse(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAdminAuth()

    // 檢查課程是否存在
    const course = await prisma.course.findUnique({
      where: { id },
    })

    if (!course) {
      return { success: false, error: '課程不存在' }
    }

    // 檢查是否有相關購買記錄
    const purchaseCount = await prisma.purchase.count({
      where: { courseId: id },
    })

    if (purchaseCount > 0) {
      return {
        success: false,
        error: `無法刪除：此課程有 ${purchaseCount} 筆購買記錄`,
      }
    }

    // 刪除課程
    await prisma.course.delete({
      where: { id },
    })

    // 記錄操作日誌
    await logAdminAction(user.id as string, 'DELETE_COURSE', id, {
      title: course.title,
      slug: course.slug,
    })

    // 重新驗證頁面快取
    revalidatePath('/admin/courses')
    revalidatePath('/admin')

    return { success: true }
  } catch (error) {
    console.error('刪除課程失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '刪除課程時發生錯誤' }
  }
}

/**
 * 切換課程狀態
 */
export async function toggleCourseStatus(
  id: string
): Promise<{ success: boolean; course?: Course; error?: string }> {
  try {
    const user = await requireAdminAuth()

    // 取得課程
    const course = await prisma.course.findUnique({
      where: { id },
    })

    if (!course) {
      return { success: false, error: '課程不存在' }
    }

    // 決定新狀態（三態循環：DRAFT -> PUBLISHED -> UNLISTED -> DRAFT）
    // 或者簡單的發佈/取消發佈邏輯
    let newStatus: CourseStatus
    switch (course.status) {
      case 'DRAFT':
        // 草稿 -> 發佈
        newStatus = 'PUBLISHED'
        break
      case 'PUBLISHED':
        // 已發佈 -> 隱藏（不公開但已購買者仍可觀看）
        newStatus = 'UNLISTED'
        break
      case 'UNLISTED':
        // 隱藏 -> 草稿（完全下架）
        newStatus = 'DRAFT'
        break
      default:
        newStatus = 'DRAFT'
    }

    // 更新狀態
    const updatedCourse = await prisma.course.update({
      where: { id },
      data: { status: newStatus },
    })

    // 記錄操作日誌
    await logAdminAction(user.id as string, 'UPDATE_COURSE', id, {
      action: 'toggle_status',
      from: course.status,
      to: newStatus,
    })

    // 重新驗證頁面快取
    revalidatePath('/admin/courses')
    revalidatePath('/admin')

    return { success: true, course: updatedCourse }
  } catch (error) {
    console.error('切換課程狀態失敗:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: '切換狀態時發生錯誤' }
  }
}
