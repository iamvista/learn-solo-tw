# 完整轉換漏斗型銷售頁模板

適合付費課程，使用共用元件組裝 7 段式轉換漏斗。

## 建議區塊順序

1. `LandingHeroSection` — Hero（含 A/B Test、倒數計時）
2. `ProblemSection` — 痛點 → 解決方案
3. `CurriculumPreview` — 課程大綱（7 階段卡片）
4. `CourseGlanceSection` — 課程資訊橫幅
5. `TestimonialSection` — 學員見證（無限滾動）
6. `InstructorSection` — 講師介紹 + 信任元素
7. `PricingSection` — 定價卡片（**免費課程不顯示**）
8. `FAQSection` — FAQ 手風琴
9. `StickyCTA` — **必須包含**
10. 免費課程：底部加 `FreeCourseCTA`

## 範例參考

`components/main/landing/pages/ios-vibe-coding.tsx`

## 完整模板

```tsx
import type { LandingPageProps } from './types'
import {
  LandingHeroSection,
  CourseGlanceSection,
  TestimonialSection,
  ProblemSection,
  CurriculumPreview,
  InstructorSection,
  FAQSection,
  PricingSection,
  StickyCTA,
  FreeCourseCTA,
  AutoEnrollHandler,
} from '@/components/main/landing'
import { PurchasedCurriculumList } from '@/components/main/player/curriculum-list'

export default function {PascalCaseName}Landing({
  course,
  purchaseStatus,
  isLoggedIn,
  isFree,
  finalPrice,
  originalPrice,
  isOnSale,
  saleEndAt,
  saleLabel,
  countdownTarget,
  saleCycleEnabled,
  saleCycleDays,
  showCountdown,
  shouldAutoEnroll,
}: LandingPageProps) {
  // ===== 已購買用戶 =====
  if (purchaseStatus.isPurchased) {
    return (
      <div className="flex flex-col">
        <LandingHeroSection
          course={course}
          isPurchased={true}
          firstLessonId={purchaseStatus.firstLessonId}
        />
        <PurchasedCurriculumList
          course={course}
          firstLessonId={purchaseStatus.firstLessonId}
        />
        <FAQSection />
      </div>
    )
  }

  // ===== 未購買用戶 =====
  return (
    <div className="flex flex-col">
      {shouldAutoEnroll && (
        <AutoEnrollHandler courseId={course.id} courseSlug={course.slug} />
      )}

      {/* 1. Hero */}
      <LandingHeroSection
        course={course}
        isFree={isFree}
        isLoggedIn={isLoggedIn}
        finalPrice={finalPrice}
        originalPrice={originalPrice}
        isOnSale={isOnSale}
        saleEndAt={saleEndAt}
        saleLabel={saleLabel}
        countdownTarget={countdownTarget}
        saleCycleEnabled={saleCycleEnabled}
        saleCycleDays={saleCycleDays}
        showCountdown={showCountdown}
      />

      {/* 2. 痛點 → 解方 */}
      <ProblemSection />

      {/* 3. 課程大綱 */}
      <CurriculumPreview course={course} />

      {/* 4. 課程資訊 */}
      <CourseGlanceSection />

      {/* 5. 學員見證 */}
      <TestimonialSection courseId={course.id} />

      {/* 6. 講師介紹 */}
      <InstructorSection />

      {/* 7. 定價（免費課程不顯示） */}
      {!isFree && <PricingSection course={course} />}

      {/* 8. FAQ */}
      <FAQSection />

      {/* 9. Sticky CTA */}
      <StickyCTA
        courseId={course.id}
        courseSlug={course.slug}
        finalPrice={finalPrice}
        originalPrice={originalPrice}
        isOnSale={isOnSale}
        isFree={isFree}
        isLoggedIn={isLoggedIn}
      />

      {/* 10. 免費課程底部 CTA */}
      {isFree && (
        <section className="bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold tracking-tight text-[#0A0A0A] sm:text-3xl">
              準備好開始了嗎？
            </h2>
            <div className="mt-8 flex justify-center">
              <FreeCourseCTA
                courseId={course.id}
                courseSlug={course.slug}
                isLoggedIn={isLoggedIn}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
```
