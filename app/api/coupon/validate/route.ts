// app/api/coupon/validate/route.ts
// 優惠碼驗證 API
// 前台結帳頁用戶輸入優惠碼時呼叫

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateCouponSchema } from '@/lib/validations/coupon'
import { validateCoupon } from '@/lib/actions/coupons'
import { calculatePrice } from '@/lib/utils/price'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = validateCouponSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '請求資料格式錯誤', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { code, courseId } = validationResult.data

    // 查詢課程和價格
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        status: { in: ['PUBLISHED', 'UNLISTED'] },
      },
    })

    if (!course) {
      return NextResponse.json(
        { error: '課程不存在或尚未發佈' },
        { status: 404 }
      )
    }

    // 計算促銷後價格
    const { finalPrice } = calculatePrice({
      originalPrice: course.price,
      salePrice: course.salePrice,
      saleEndAt: course.saleEndAt,
      saleCycleEnabled: course.saleCycleEnabled,
      saleCycleDays: course.saleCycleDays,
    })

    // 取得用戶 ID（訪客為 null）
    const session = await auth()
    const userId = session?.user?.id || null

    // 驗證優惠券
    const result = await validateCoupon(code, courseId, finalPrice, userId)

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      couponId: result.couponId,
      code: result.code,
      name: result.name,
      discountType: result.discountType,
      discountAmount: result.discountAmount,
      finalPrice: result.finalPrice,
    })
  } catch (error) {
    console.error('[Coupon Validate] 錯誤:', error)
    return NextResponse.json(
      { error: '驗證優惠碼失敗，請稍後再試' },
      { status: 500 }
    )
  }
}
