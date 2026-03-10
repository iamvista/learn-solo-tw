// app/(main)/checkout/page.tsx
// 結帳頁面
// 顯示訂單確認資訊並處理付款流程

import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculatePrice } from '@/lib/utils/price'
import { CheckoutClient } from './checkout-client'
import { getPublicSiteSettings } from '@/lib/site-settings-public'
import { MetaPixelAddToCart, MetaPixelInitiateCheckout } from '@/components/common/meta-pixel-events'

export const metadata: Metadata = {
  title: '結帳 | 課程平台',
  description: '完成您的課程購買',
}

interface CheckoutPageProps {
  searchParams: Promise<{
    courseId?: string
  }>
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  // 1. 取得登入狀態（不再強制登入）
  const session = await auth()

  // 2. 取得課程 ID
  const { courseId } = await searchParams

  if (!courseId) {
    redirect('/')
  }

  // 3. 查詢課程資訊
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      status: {
        in: ['PUBLISHED', 'UNLISTED'],
      },
    },
    select: {
      id: true,
      title: true,
      subtitle: true,
      slug: true,
      coverImage: true,
      price: true,
      salePrice: true,
      saleEndAt: true,
      saleCycleEnabled: true,
      saleCycleDays: true,
    },
  })

  if (!course) {
    notFound()
  }

  // 4. 檢查是否已購買
  if (session?.user?.id) {
    const existingPurchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    })

    if (existingPurchase && !existingPurchase.revokedAt) {
      // 已購買，重導向到課程頁面
      redirect(`/courses/${course.slug}`)
    }
  }

  // 5. 取得公開設定（含登入方式開關）
  const siteSettings = await getPublicSiteSettings()

  // 6. 計算價格（使用統一的價格計算邏輯）
  const { finalPrice, isOnSale } = calculatePrice({
    originalPrice: course.price,
    salePrice: course.salePrice,
    saleEndAt: course.saleEndAt,
    saleCycleEnabled: course.saleCycleEnabled,
    saleCycleDays: course.saleCycleDays,
  })

  return (
    <div className="min-h-screen bg-white py-12 sm:py-16 lg:py-24">
      {/* Meta Pixel 漏斗事件 */}
      <MetaPixelAddToCart
        contentName={course.title}
        contentId={course.id}
        value={finalPrice}
      />
      <MetaPixelInitiateCheckout
        contentName={course.title}
        contentId={course.id}
        value={finalPrice}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A] text-center mb-12 sm:text-4xl">
          確認訂單
        </h1>

        <CheckoutClient
          course={{
            id: course.id,
            title: course.title,
            subtitle: course.subtitle,
            slug: course.slug,
            coverImage: course.coverImage,
            originalPrice: course.price,
            finalPrice,
            isOnSale,
            saleEndAt: course.saleEndAt?.toISOString() ?? null,
          }}
          user={{
            name: session?.user?.name || '',
            email: session?.user?.email || '',
            isLoggedIn: !!session?.user?.id,
          }}
          googleLoginEnabled={siteSettings.googleLoginEnabled}
          appleLoginEnabled={siteSettings.appleLoginEnabled}
        />
      </div>
    </div>
  )
}
