// lib/actions/coupons.ts
// 優惠券管理 Server Actions
// 提供優惠券 CRUD、驗證等功能

'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/require-admin'
import { couponSchema, type CouponFormData } from '@/lib/validations/coupon'
import type { DiscountType } from '@prisma/client'

// ==================== Types ====================

export interface CouponListItem {
  id: string
  name: string
  code: string
  discountType: DiscountType
  amountOff: number | null
  percentOff: number | null
  maxDiscountAmount: number | null
  maxRedemptions: number | null
  timesRedeemed: number
  maxPerUser: number | null
  minimumAmount: number | null
  firstTimeOnly: boolean
  active: boolean
  startsAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  _count: { courses: number }
}

export interface CouponDetail extends CouponListItem {
  description: string | null
  courses: { id: string; title: string }[]
}

// ==================== CRUD ====================

/**
 * 取得優惠券列表
 */
export async function getCoupons(): Promise<CouponListItem[]> {
  await requireAdminAuth()

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { courses: true },
      },
    },
  })

  return coupons
}

/**
 * 取得單一優惠券詳情
 */
export async function getCouponById(id: string): Promise<CouponDetail | null> {
  await requireAdminAuth()

  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: {
      courses: {
        select: { id: true, title: true },
      },
      _count: {
        select: { courses: true },
      },
    },
  })

  return coupon
}

/**
 * 建立優惠券
 */
export async function createCoupon(
  data: CouponFormData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    await requireAdminAuth()

    const validated = couponSchema.parse(data)

    // 檢查代碼唯一性
    const existing = await prisma.coupon.findUnique({
      where: { code: validated.code },
    })
    if (existing) {
      return { success: false, error: '此優惠碼已存在' }
    }

    const coupon = await prisma.coupon.create({
      data: {
        name: validated.name,
        code: validated.code,
        description: validated.description || null,
        discountType: validated.discountType,
        amountOff: validated.discountType === 'AMOUNT' ? validated.amountOff : null,
        percentOff: validated.discountType === 'PERCENT' ? validated.percentOff : null,
        maxDiscountAmount: validated.discountType === 'PERCENT' ? validated.maxDiscountAmount : null,
        maxRedemptions: validated.maxRedemptions || 0,
        maxPerUser: validated.maxPerUser || 0,
        minimumAmount: validated.minimumAmount || null,
        firstTimeOnly: validated.firstTimeOnly,
        active: validated.active,
        startsAt: validated.startsAt ? new Date(validated.startsAt) : null,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        courses: validated.courseIds.length > 0
          ? { connect: validated.courseIds.map((id) => ({ id })) }
          : undefined,
      },
    })

    revalidatePath('/admin/coupons')
    return { success: true, id: coupon.id }
  } catch (error) {
    console.error('建立優惠券失敗:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: '建立優惠券時發生錯誤' }
  }
}

/**
 * 更新優惠券（代碼不可修改）
 */
export async function updateCoupon(
  id: string,
  data: CouponFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminAuth()

    const validated = couponSchema.parse(data)

    const existing = await prisma.coupon.findUnique({
      where: { id },
      include: { courses: { select: { id: true } } },
    })
    if (!existing) {
      return { success: false, error: '優惠券不存在' }
    }

    // 取消所有現有課程關聯，再重新設定
    await prisma.coupon.update({
      where: { id },
      data: {
        name: validated.name,
        // code 不可修改
        description: validated.description || null,
        discountType: validated.discountType,
        amountOff: validated.discountType === 'AMOUNT' ? validated.amountOff : null,
        percentOff: validated.discountType === 'PERCENT' ? validated.percentOff : null,
        maxDiscountAmount: validated.discountType === 'PERCENT' ? validated.maxDiscountAmount : null,
        maxRedemptions: validated.maxRedemptions || 0,
        maxPerUser: validated.maxPerUser || 0,
        minimumAmount: validated.minimumAmount || null,
        firstTimeOnly: validated.firstTimeOnly,
        active: validated.active,
        startsAt: validated.startsAt ? new Date(validated.startsAt) : null,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        courses: {
          set: validated.courseIds.map((courseId) => ({ id: courseId })),
        },
      },
    })

    revalidatePath('/admin/coupons')
    revalidatePath(`/admin/coupons/${id}`)
    return { success: true }
  } catch (error) {
    console.error('更新優惠券失敗:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: '更新優惠券時發生錯誤' }
  }
}

/**
 * 切換優惠券啟用狀態
 */
export async function toggleCouponActive(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminAuth()

    const coupon = await prisma.coupon.findUnique({ where: { id } })
    if (!coupon) {
      return { success: false, error: '優惠券不存在' }
    }

    await prisma.coupon.update({
      where: { id },
      data: { active: !coupon.active },
    })

    revalidatePath('/admin/coupons')
    return { success: true }
  } catch (error) {
    console.error('切換優惠券狀態失敗:', error)
    return { success: false, error: '操作失敗' }
  }
}

// ==================== 優惠券驗證邏輯 ====================

export interface CouponValidationResult {
  valid: boolean
  error?: string
  couponId?: string
  code?: string
  name?: string
  discountType?: DiscountType
  discountAmount?: number
  finalPrice?: number
}

/**
 * 驗證優惠碼（供 API 和訂單建立使用）
 *
 * @param code - 優惠碼（已轉大寫）
 * @param courseId - 課程 ID
 * @param priceBeforeCoupon - 套用優惠券前的價格（促銷價計算後）
 * @param userId - 用戶 ID（訪客為 null）
 */
export async function validateCoupon(
  code: string,
  courseId: string,
  priceBeforeCoupon: number,
  userId: string | null
): Promise<CouponValidationResult> {
  const normalizedCode = code.toUpperCase().trim()

  // 1. 查詢優惠券
  const coupon = await prisma.coupon.findUnique({
    where: { code: normalizedCode },
    include: {
      courses: { select: { id: true } },
    },
  })

  if (!coupon) {
    return { valid: false, error: '此優惠碼不存在' }
  }

  // 2. 啟用狀態
  if (!coupon.active) {
    return { valid: false, error: '此優惠碼已失效' }
  }

  // 3. 有效期間
  const now = new Date()
  if (coupon.startsAt && now < coupon.startsAt) {
    return { valid: false, error: '此優惠碼不在有效期間內' }
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    return { valid: false, error: '此優惠碼不在有效期間內' }
  }

  // 4. 總兌換次數
  if (coupon.maxRedemptions && coupon.maxRedemptions > 0 && coupon.timesRedeemed >= coupon.maxRedemptions) {
    return { valid: false, error: '此優惠碼已達使用上限' }
  }

  // 5. 適用課程
  if (coupon.courses.length > 0) {
    const applicable = coupon.courses.some((c) => c.id === courseId)
    if (!applicable) {
      return { valid: false, error: '此優惠碼不適用於此課程' }
    }
  }

  // 6. 最低消費
  if (coupon.minimumAmount && priceBeforeCoupon < coupon.minimumAmount) {
    return {
      valid: false,
      error: `訂單金額未達最低消費 NT$${coupon.minimumAmount.toLocaleString()}`,
    }
  }

  // 以下檢查需要用戶身份，訪客跳過
  if (userId) {
    // 7. 個人使用次數
    if (coupon.maxPerUser && coupon.maxPerUser > 0) {
      const userRedemptions = await prisma.couponRedemption.count({
        where: { couponId: coupon.id, userId },
      })
      if (userRedemptions >= coupon.maxPerUser) {
        return { valid: false, error: '您已達此優惠碼的使用上限' }
      }
    }

    // 8. 首購限制
    if (coupon.firstTimeOnly) {
      const hasPurchase = await prisma.purchase.findFirst({
        where: { userId, revokedAt: null },
      })
      if (hasPurchase) {
        return { valid: false, error: '此優惠碼僅限首次購買用戶使用' }
      }
    }
  }

  // 9. 計算折扣金額
  let discountAmount: number
  if (coupon.discountType === 'AMOUNT') {
    discountAmount = coupon.amountOff || 0
  } else {
    discountAmount = Math.round(priceBeforeCoupon * (coupon.percentOff || 0) / 100)
    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount
    }
  }

  // 折扣不超過商品價格
  discountAmount = Math.min(discountAmount, priceBeforeCoupon)

  const finalPrice = Math.max(0, priceBeforeCoupon - discountAmount)

  return {
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    name: coupon.name,
    discountType: coupon.discountType,
    discountAmount,
    finalPrice,
  }
}

/**
 * 取得特定課程的優惠券列表（供定價頁面使用）
 */
export async function getCouponsByCourseId(courseId: string): Promise<CouponListItem[]> {
  await requireAdminAuth()

  const coupons = await prisma.coupon.findMany({
    where: {
      courses: { some: { id: courseId } },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { courses: true },
      },
    },
  })

  return coupons
}

/**
 * 取得所有已發佈課程（供優惠券表單的課程選擇器使用）
 */
export async function getCoursesForCoupon(): Promise<{ id: string; title: string }[]> {
  await requireAdminAuth()

  return prisma.course.findMany({
    where: { status: { in: ['PUBLISHED', 'UNLISTED'] } },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  })
}
