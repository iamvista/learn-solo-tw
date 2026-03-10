# 共用元件完整參考

## 行為元件

### `StickyCTA` — 手機端浮動購買按鈕

- **位置**：`@/components/main/landing`
- **行為**：滾動超過 400px 後出現，桌面端隱藏（`lg:hidden`）
- **免費**：顯示「免費」+ 「免費加入」按鈕 → `enrollFreeCourse()`
- **付費**：顯示價格 + 「立即加入」→ `/checkout?courseId=...`
- **Props**：

```ts
interface StickyCTAProps {
  courseId: string
  courseSlug: string
  finalPrice: number
  originalPrice?: number
  isOnSale?: boolean    // default false
  isFree?: boolean      // default false
  isLoggedIn?: boolean  // default false
}
```

### `FreeCourseCTA` — 免費課程註冊按鈕

- **位置**：`@/components/main/landing`
- **行為**：未登入 → `/login?callbackUrl=/courses/{slug}?enroll=true`；已登入 → `enrollFreeCourse()` → 導向第一堂課
- **僅用於免費課程**。付費課程用 `<Link href="/checkout?courseId=...">` + `<Button>`
- **Props**：

```ts
interface FreeCourseCTAProps {
  courseId: string
  courseSlug: string
  isLoggedIn: boolean
  className?: string
  size?: 'default' | 'lg'  // default 'lg'
}
```

### `AutoEnrollHandler` — 自動註冊處理器

- **位置**：`@/components/main/landing`
- **行為**：mount 時呼叫 `enrollFreeCourse()`，成功→導向第一堂課
- **不渲染 UI**
- **使用時機**：`shouldAutoEnroll` 為 `true` 時渲染
- **Props**：`courseId: string`, `courseSlug: string`

### `PurchasedCurriculumList` — 已購買課程大綱

- **位置**：`@/components/main/player/curriculum-list`
- **用途**：已購買用戶版面，顯示章節列表（含進度、可點擊進入）
- **Props**：`course: CourseDetail`, `firstLessonId: string | null`

---

## 版面元件

> **注意**：以下元件內部寫死了「iOS Vibe Coding」課程的文案。
> 不同主題課程建議用簡潔型自行撰寫，或先修改這些元件。

### `LandingHeroSection` — Hero 區塊

- **特性**：A/B Test（PostHog）、倒數計時器、HeroAnimation
- **文案寫死**：標題「不需要程式基礎，也能做出你的 iOS App」、Social Proof「500+ 學員見證」
- **已購買**：`isPurchased={true}` + `firstLessonId` → CTA「進入課程」
- **免費**：自動用 `FreeCourseCTA`
- **付費**：Link → `/checkout?courseId=...` + 限時優惠倒數
- **Props**：

```ts
interface HeroSectionProps {
  course: CourseDetail
  primaryCtaText?: string
  primaryCtaLink?: string
  minimal?: boolean         // 精簡模式（用於首頁展示）
  isPurchased?: boolean
  firstLessonId?: string | null
  isFree?: boolean
  isLoggedIn?: boolean
  finalPrice?: number
  originalPrice?: number
  isOnSale?: boolean
  saleEndAt?: Date | null
  saleLabel?: string
  countdownTarget?: Date | null
  saleCycleEnabled?: boolean
  saleCycleDays?: number | null
  showCountdown?: boolean
}
```

### `ProblemSection` — 痛點 → 解決方案

- **特性**：4 組痛點卡片 + 底部轉折 Banner（外包 vs 自學 vs Vibe Coding）
- **文案寫死**：全部 iOS 開發相關
- **Props**：無

### `CurriculumPreview` — 課程大綱預覽

- **特性**：7 階段卡片，手機預設顯示 3 個可展開，可展開實際單元列表
- **文案寫死**：7 階段標題/副標/bullet（iOS 相關）
- **動態**：從 `course.chapters` 讀取實際單元
- **Props**：`course: CourseDetail`

### `CourseGlanceSection` — 課程資訊橫幅

- **特性**：5 個資訊卡片
- **文案寫死**：「21 個核心單元」「2.5 小時」「450+ 學員」
- **Props**：無

### `TestimonialSection` — 學員見證

- **特性**：雙排無限滾動 + 實體課照片
- **文案寫死**：所有評價與照片
- **Props**：`courseId?: string`（底部 CTA Link 用）

### `InstructorSection` — 講師介紹

- **特性**：講師卡片（照片/語錄/經歷）+ YouTube 影片 + 信任元素
- **文案寫死**：「Ray 貓（吳睿誠）」、經歷、語錄
- **Props**：無

### `PricingSection` — 定價區塊

- **特性**：價值堆疊 + 定價卡片
- **文案寫死**：價值堆疊清單、限量 Bonus
- **免費**：CTA「立即免費加入」→ `enrollFreeCourse()`
- **付費**：CTA「立即加入課程」→ `/checkout?courseId=...`
- **Props**：`course: CourseDetail`

### `FAQSection` — FAQ 手風琴

- **特性**：shadcn Accordion，資料源 `lib/constants/faq.ts`
- **文案寫死**：FAQ 全是 iOS 課程相關
- **底部寫死**：`ray@ray-realms.com`
- **Props**：無

### `CoursePreviewVideo` — 講師承諾影片

- **特性**：嵌入 `InstructorSection` 內，YouTube 嵌入
- **Props**：`videoId?: string`（預設特定 YouTube ID）
