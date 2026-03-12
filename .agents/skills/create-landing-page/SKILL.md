---
name: create-landing-page
description: >
  替課程建立專屬的 React 銷售頁元件。
  Use when: 用戶說「建立銷售頁」、「建立 landing page」、「替 XXX 課程建立銷售頁」、
  「新增課程銷售頁元件」、「create landing page」。
  涵蓋免費與付費課程的完整 CTA 邏輯、元件註冊、設計規範。
---

# Create Landing Page

## Workflow

### 1. 確認課程資訊

向用戶確認（若尚未提供）：
- **課程 slug**（用於檔名，如 `react-beginner`）
- **免費或付費？**
- **課程主題與目標受眾**
- **風格**：簡潔型 or 完整漏斗型

### 2. 建立元件

在 `components/main/landing/pages/{slug}.tsx` 建立。

規範：
1. `'use client'` 指令
2. `export default function` 匯出
3. Props 用 `LandingPageProps`（從 `./types` 匯入）
4. 處理 `purchaseStatus.isPurchased`（已購買版面）
5. 包含 `StickyCTA`（手機浮動按鈕）
6. 免費課程處理 `shouldAutoEnroll` + `AutoEnrollHandler`

根據風格選擇模板：
- **簡潔型**：見 [references/simple-template.md](references/simple-template.md)
- **完整漏斗型**：見 [references/funnel-template.md](references/funnel-template.md)

### 3. 註冊到 Loader

在 `components/main/landing/pages/loader.ts` 的 `landingPages` 新增：

```ts
'{slug}': () => import('./{slug}'),
```

### 4. 告知用戶後續設定

1. 元件已建立在 `components/main/landing/pages/{slug}.tsx`
2. 已在 `loader.ts` 註冊
3. 後臺「課程管理 → 課程資訊 → 銷售頁設定」：模式選「React 元件」，Slug 填 `{slug}`（與課程 slug 相同可留空）

## 免費 vs 付費 CTA 行為

| 場景 | 免費課程 | 付費課程 |
|------|----------|----------|
| Hero CTA | `<FreeCourseCTA>` | `<Link href="/checkout?courseId=..."><Button>` |
| 底部 CTA | `<FreeCourseCTA>` | `<Link href="/checkout?courseId=..."><Button>` |
| StickyCTA | 「免費加入」→ `enrollFreeCourse()` | 「立即加入」→ `/checkout` |
| PricingSection | **不顯示** | 顯示定價卡片 |
| AutoEnrollHandler | `shouldAutoEnroll` 時渲染 | 不需要 |

## 共用元件速查

詳細的 Props、行為、限制說明見 [references/components.md](references/components.md)。

### 行為元件（處理購買邏輯）
| 元件 | 用途 |
|------|------|
| `StickyCTA` | **必須包含**。手機端浮動 CTA，自動區分免費/付費 |
| `FreeCourseCTA` | 免費課程註冊按鈕。未登入→登入頁，已登入→自動加入 |
| `AutoEnrollHandler` | 自動註冊處理器。不渲染 UI，`shouldAutoEnroll` 時使用 |
| `PurchasedCurriculumList` | 已購買版面的課程大綱（從 `@/components/main/player/curriculum-list` 匯入） |

### 版面元件（完整漏斗型使用）

> **注意**：以下元件內部寫死了特定課程文案。不同主題課程建議用簡潔型自行撰寫。

| 元件 | 文案寫死？ | Props |
|------|-----------|-------|
| `LandingHeroSection` | 是（iOS 標題、Social Proof） | `course` + 價格/促銷相關 |
| `ProblemSection` | 是（iOS 痛點） | 無 |
| `CurriculumPreview` | 是（7 階段標題）；動態讀 `course.chapters` | `course` |
| `CourseGlanceSection` | 是（21 單元、2.5 小時） | 無 |
| `TestimonialSection` | 是（學員評價） | `courseId?` |
| `InstructorSection` | 是（Ray 貓資料） | 無 |
| `PricingSection` | 是（價值堆疊清單） | `course` |
| `FAQSection` | 是（`lib/constants/faq.ts`） | 無 |

## 設計規範

- 品牌色定義在 `app/globals.css` CSS 變數。參考現有元件色碼保持一致
- 動畫用 `framer-motion`：`whileInView` 做滾動觸發，`animate` 做頁面載入
- 響應式：行動優先，`sm:` / `lg:` breakpoints
- 區塊間距：`py-12 sm:py-16 lg:py-24`
- 背景交替：`bg-white` → `bg-[#FAFAFA]` → `bg-[#0A0A0A]`（深色轉折）
