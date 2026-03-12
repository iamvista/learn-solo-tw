// components/main/landing/pages/default.tsx
// 預設銷售頁 — 當課程沒有對應的 React 銷售頁元件時使用
// 從 DB 資料自動組裝基本版面

'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Shield, Clock, BookOpen, CheckCircle2 } from 'lucide-react'
import type { LandingPageProps } from './types'
import { formatPrice } from '@/lib/utils/price'
import { CurriculumPreview, StickyCTA, FreeCourseCTA, AutoEnrollHandler } from '@/components/main/landing'
import { PurchasedCurriculumList } from '@/components/main/player/curriculum-list'

export default function DefaultLanding({
  course,
  purchaseStatus,
  isLoggedIn,
  isFree,
  finalPrice,
  originalPrice,
  isOnSale,
  shouldAutoEnroll,
}: LandingPageProps) {
  // 已購買
  if (purchaseStatus.isPurchased) {
    return (
      <div className="flex flex-col">
        {/* 簡化 Hero */}
        <section className="bg-white py-12 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A] sm:text-5xl">
              {course.title}
            </h1>
            {course.subtitle && (
              <p className="mt-4 text-lg text-[#525252]">{course.subtitle}</p>
            )}
            {purchaseStatus.firstLessonId && (
              <Button asChild size="lg" className="mt-8 rounded-full bg-[#C41E3A] px-8 text-base font-semibold text-white hover:bg-[#A01830]">
                <Link href={`/courses/${course.slug}/lessons/${purchaseStatus.firstLessonId}`}>
                  進入課程 <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>
        </section>
        <PurchasedCurriculumList course={course} firstLessonId={purchaseStatus.firstLessonId} />
      </div>
    )
  }

  // 未購買
  return (
    <div className="flex flex-col">
      {shouldAutoEnroll && (
        <AutoEnrollHandler courseId={course.id} courseSlug={course.slug} />
      )}

      {/* Hero */}
      <section className="bg-white py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A] sm:text-5xl lg:text-6xl">
            {course.title}
          </h1>
          {course.subtitle && (
            <p className="mt-4 text-lg text-[#525252] sm:text-xl">{course.subtitle}</p>
          )}
          {course.description && (
            <p className="mx-auto mt-6 max-w-2xl text-base text-[#525252]">
              {course.description}
            </p>
          )}

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {isFree ? (
              <FreeCourseCTA courseId={course.id} courseSlug={course.slug} isLoggedIn={isLoggedIn} />
            ) : (
              <Button asChild size="lg" className="rounded-full bg-[#C41E3A] px-8 py-6 text-base font-semibold text-white hover:bg-[#A01830]">
                <Link href={`/checkout?courseId=${course.id}`}>
                  立即加入課程 <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>

          {/* 價格資訊 */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
            {isFree ? (
              <span className="font-semibold text-[#C41E3A]">限時免費</span>
            ) : (
              <>
                {isOnSale && (
                  <span className="text-[#A3A3A3] line-through">原價 {formatPrice(originalPrice)}</span>
                )}
                <span className="text-lg font-bold text-[#0A0A0A]">{formatPrice(finalPrice)}</span>
              </>
            )}
            {!isFree && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C41E3A]/30 bg-[#C41E3A]/5 px-3 py-1 text-sm font-semibold text-[#C41E3A]">
                <Shield className="h-3.5 w-3.5" />
                7 日退費保證
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 課程資訊概覽 */}
      <section className="border-t border-[#F5F5F5] bg-[#FAFAFA] py-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-[#525252]">
            <BookOpen className="h-4 w-4 text-[#C41E3A]" />
            {course.lessonCount} 個單元
          </div>
          {course.totalDuration > 0 && (
            <div className="flex items-center gap-2 text-sm text-[#525252]">
              <Clock className="h-4 w-4 text-[#C41E3A]" />
              {Math.round(course.totalDuration / 60)} 分鐘
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-[#525252]">
            <CheckCircle2 className="h-4 w-4 text-[#C41E3A]" />
            永久觀看
          </div>
        </div>
      </section>

      {/* 課程大綱 */}
      <CurriculumPreview course={course} />

      {/* 底部 CTA */}
      <section className="bg-[#0A0A0A] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">準備好開始了嗎？</h2>
          <div className="mt-8 flex justify-center">
            {isFree ? (
              <FreeCourseCTA courseId={course.id} courseSlug={course.slug} isLoggedIn={isLoggedIn} />
            ) : (
              <Button asChild size="lg" className="rounded-full bg-[#C41E3A] px-8 py-6 text-base font-semibold text-white hover:bg-[#A01830]">
                <Link href={`/checkout?courseId=${course.id}`}>
                  立即加入課程 <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Sticky CTA */}
      <StickyCTA
        courseId={course.id}
        courseSlug={course.slug}
        finalPrice={finalPrice}
        originalPrice={originalPrice}
        isOnSale={isOnSale}
        isFree={isFree}
        isLoggedIn={isLoggedIn}
      />
    </div>
  )
}
