本檔案為針對 Agent 的開發指南，適用於此通用型線上課程販售平臺。

## Project Overview

通用型線上課程販售平臺 — 使用 Next.js 15 + Prisma 7 建構，支援 Google/Apple OAuth 登入、PayUni 金流、Cloudflare Stream 影片串流。可直接部署為獨立的課程銷售業務。

## Common Commands

```bash
# Development
pnpm dev                    # 啟動開發伺服器 (http://localhost:3000)
pnpm build                  # Production 建置
pnpm start                  # 啟動 Production 伺服器
pnpm lint                   # 執行 ESLint

# Database (Prisma)
pnpm prisma generate        # 產生 Prisma Client
pnpm prisma db push         # 同步 Schema 到資料庫
pnpm prisma studio          # 開啟資料庫 GUI

# Admin
pnpm admin:init <email>     # 將用戶升級為 ADMIN 角色
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router) + React 19
- **Database**: PostgreSQL + Prisma 7
- **Auth**: NextAuth v5 (Google, Apple, Credentials)
- **UI**: Tailwind CSS v4 + shadcn/ui
- **Payment**: PayUni 金流
- **Media**: Cloudflare Stream (影片) + R2 (圖片/檔案)
- **Email**: Resend
- **Animation**: framer-motion
- **Editor**: Milkdown (Markdown)
- **Form**: React Hook Form + Zod

### Route Groups (App Router)
- `app/(admin)/admin/` — 後臺管理（需 ADMIN 或 EDITOR 角色）
- `app/(auth)/` — 認證頁面（登入、註冊）
- `app/(main)/` — 前臺公開頁面
- `app/(setup)/` — 初始設定流程
- `app/api/` — API Routes

### Key Libraries
- `lib/auth.ts` — NextAuth v5 設定（Google, Apple, Credentials providers）
- `lib/auth.config.ts` — Edge-compatible auth config（middleware 使用）
- `lib/prisma.ts` — Prisma Client 單例
- `lib/payuni.ts` — PayUni 金流工具
- `lib/cloudflare.ts` — Cloudflare Stream/R2 API
- `lib/actions/` — Server Actions（資料寫入操作）
- `lib/validations/` — Zod 驗證 Schema

### Middleware
`middleware.ts` 負責路由保護：
- `/admin/*` 需要 ADMIN 或 EDITOR 角色
- `/courses/[slug]/lessons/*` 需要登入
- 已登入用戶會被重導離開 `/login` 和 `/register`

### Database Models (Prisma)
核心 Model：`User`, `Course`, `Chapter`, `Lesson`, `Order`, `Purchase`, `Media`

用戶角色：`USER`（預設）、`EDITOR`（內容管理）、`ADMIN`（完整權限）

### UI Components
- `components/ui/` — shadcn/ui 基礎元件
- `components/admin/` — 後臺專用元件
- `components/main/` — 前臺元件
- `components/layouts/` — Layout 元件

### Path Aliases
使用 `@/*` 從專案根目錄匯入（如 `@/lib/prisma`、`@/components/ui/button`）

## 核心業務流程

### Payment Flow（金流）
1. 用戶在銷售頁點擊購買
2. Server Action 建立內部訂單並呼叫 PayUni API
3. 用戶被導向 PayUni 付款頁面
4. PayUni 透過 webhook 通知 `/api/webhooks/payuni`
5. Webhook handler 更新訂單狀態並建立 Purchase 記錄

### Video Streaming（影片串流）
- 影片託管於 Cloudflare Stream
- 透過 TUS 協議在後臺媒體中心上傳
- 播放使用 Cloudflare Stream Player + Signed URLs
- 觀看進度透過 `/api/lesson-progress` API 追蹤

## 銷售頁系統（Landing Page）

這是本平臺最具彈性的設計之一。每個課程都可以擁有完全客製化的銷售頁。

### 運作機制

1. **銷售頁模式**：每個課程可選擇「React 元件」或「自訂 HTML」模式
2. **React 元件模式**（推薦）：
   - 元件放在 `components/main/landing/pages/{slug}.tsx`
   - 透過 `loader.ts` 動態載入
   - 沒有對應元件時，自動 fallback 到 `default.tsx`
3. **自訂 HTML 模式**：直接在後臺貼入 HTML，SSR 渲染

### 建立新銷售頁的方式

**最推薦的做法：直接跟 AI 說「替 `{course-slug}` 課程建立一個專屬銷售頁」。**

AI 會自動：
- 在 `components/main/landing/pages/{slug}.tsx` 建立元件
- 在 `loader.ts` 註冊該元件
- 使用平臺提供的共用元件（`StickyCTA`、`FreeCourseCTA`、`FAQSection` 等）
- 根據課程性質設計適合的版面與文案

### 銷售頁元件結構

```
components/main/landing/
├── pages/
│   ├── types.ts          # LandingPageProps 型別定義
│   ├── loader.ts         # 動態載入 registry
│   ├── default.tsx       # 預設銷售頁（自動從 DB 資料組裝）
│   └── {slug}.tsx        # 各課程的專屬銷售頁
├── index.ts              # 共用元件匯出
├── hero-section.tsx      # Hero 區塊
├── pricing-section.tsx   # 定價區塊
├── curriculum-preview.tsx # 課程大綱預覽
├── faq-section.tsx       # FAQ 區塊
├── instructor-section.tsx # 講師介紹
├── sticky-cta.tsx        # 浮動購買按鈕
├── free-course-cta.tsx   # 免費課程 CTA
└── auto-enroll-handler.tsx # 自動註冊處理
```

### LandingPageProps 型別

每個銷售頁元件都接收 `LandingPageProps`，包含：
- `course` — 課程完整資料（標題、描述、章節、單元數等）
- `purchaseStatus` — 購買狀態（是否已購買、第一堂課 ID）
- `isLoggedIn` — 是否已登入
- `isFree` / `finalPrice` / `originalPrice` / `isOnSale` — 價格相關
- `shouldAutoEnroll` — 是否自動註冊（免費課程）

### 銷售頁開發慣例

1. **已購買用戶**：顯示簡化 Hero + 課程大綱列表（使用 `PurchasedCurriculumList`）
2. **未購買用戶**：完整銷售頁（Hero → 適合誰 → 課程大綱 → 講師 → FAQ → CTA）
3. **免費課程**：使用 `FreeCourseCTA` 元件；付費課程用 `Link` 導向結帳頁
4. **必須包含 `StickyCTA`**：浮動購買按鈕，確保用戶隨時可以購買
5. **動畫**：使用 `framer-motion` 的 `motion` 元件，搭配 `whileInView` 做滾動觸發

## 後臺管理系統

### 課程管理流程
1. 新增課程：`/admin/courses/new`
2. 編輯課程資訊：`/admin/courses/[id]/info`（包含銷售頁設定、SEO、定價）
3. 編輯課程內容：`/admin/courses/[id]/curriculum`（章節與單元）
4. 課程列表：`/admin/courses`

### 後臺路由一覽
| 路由 | 說明 |
|------|------|
| `/admin` | Dashboard（統計概覽） |
| `/admin/courses` | 課程管理 |
| `/admin/courses/[id]/info` | 課程編輯 |
| `/admin/courses/[id]/curriculum` | 章節單元編輯 |
| `/admin/media` | 媒體中心 |
| `/admin/users` | 學員管理 |
| `/admin/orders` | 訂單管理 |
| `/admin/analytics` | 銷售分析 |
| `/admin/settings` | 系統設定 |

### 前臺路由一覽
| 路由 | 說明 |
|------|------|
| `/` | 首頁（課程列表） |
| `/courses` | 所有課程 |
| `/courses/[slug]` | 課程銷售頁 |
| `/courses/[slug]/lessons/[id]` | 課程播放頁（需登入+購買） |
| `/checkout` | 結帳頁 |
| `/my-courses` | 我的課程 |

## 開發規範

### 修改程式碼時
- 使用 `@/*` 路徑別名匯入
- Server Actions 放在 `lib/actions/` 目錄
- Zod 驗證放在 `lib/validations/` 目錄
- 前臺元件放 `components/main/`，後臺元件放 `components/admin/`

### 樣式規範
- 使用 Tailwind CSS，不使用 CSS Modules
- 品牌色彩由平臺擁有者自行定義，定義在 `app/globals.css` 的 CSS 變數中（`--primary`、`--foreground` 等）
- 開發新元件時，**優先使用 CSS 變數**（如 `text-primary`、`bg-primary`），避免寫死 hex 色碼
- 若需要參考現有銷售頁元件的樣式，以該元件實際使用的顏色為準，但理解這些是可被替換的品牌色
