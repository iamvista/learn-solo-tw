# 簡潔型銷售頁模板

適合免費課程或入門課程。自行撰寫各區塊，不使用共用版面元件（因為共用元件寫死了特定課程文案）。

## 建議區塊順序

1. Hero — 課程標題 + 副標 + CTA + 信任信號
2. 適合誰 — 4 點條件清單
3. 課程大綱 — 各單元概覽卡片
4. 講師簡介 — 名字 + 經歷
5. FAQ — 課程專屬問答（自行定義）
6. 底部 CTA — 最終行動呼籲
7. StickyCTA — **必須包含**

## 範例參考

`components/main/landing/pages/react-beginner.tsx`

## 完整模板

```tsx
'use client'

import { motion } from 'framer-motion'
import type { LandingPageProps } from './types'
import {
  StickyCTA,
  FreeCourseCTA,
  AutoEnrollHandler,
} from '@/components/main/landing'
import { PurchasedCurriculumList } from '@/components/main/player/curriculum-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function {PascalCaseName}Landing({
  course,
  purchaseStatus,
  isLoggedIn,
  isFree,
  finalPrice,
  originalPrice,
  isOnSale,
  shouldAutoEnroll,
}: LandingPageProps) {
  // ===== 已購買用戶 =====
  if (purchaseStatus.isPurchased) {
    return (
      <div className="flex flex-col">
        <section className="bg-white py-12 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A] sm:text-5xl">
              {course.title}
            </h1>
            <p className="mt-4 text-lg text-[#525252]">{course.subtitle}</p>
            {purchaseStatus.firstLessonId && (
              <Button asChild size="lg" className="mt-8 rounded-full bg-[#F5A524] px-8 text-base font-semibold text-white hover:bg-[#E09000]">
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

  // ===== 未購買用戶 =====
  return (
    <div className="flex flex-col">
      {shouldAutoEnroll && (
        <AutoEnrollHandler courseId={course.id} courseSlug={course.slug} />
      )}

      {/* Hero Section */}
      <section className="bg-white py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight text-[#0A0A0A] sm:text-5xl lg:text-6xl"
          >
            {course.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-[#525252] sm:text-xl"
          >
            {course.subtitle}
          </motion.p>

          {/* CTA — 根據免費/付費選擇 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex justify-center"
          >
            {isFree ? (
              <FreeCourseCTA
                courseId={course.id}
                courseSlug={course.slug}
                isLoggedIn={isLoggedIn}
              />
            ) : (
              <Button asChild size="lg" className="rounded-full bg-[#F5A524] px-8 py-6 text-base font-semibold text-white hover:bg-[#E09000]">
                <Link href={`/checkout?courseId=${course.id}`}>
                  立即加入課程 <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
          </motion.div>
        </div>
      </section>

      {/* 適合誰 */}
      {/* 課程大綱 */}
      {/* 講師簡介 */}
      {/* FAQ（自行定義 faqs 陣列） */}
      {/* 底部 CTA */}

      {/* Sticky CTA — 必須包含 */}
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
```
