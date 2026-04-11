# v1.4 新功能使用手冊

> 本次升級從官方 v1.4.0 cherry-pick 了 6 項功能。以下是每項功能的設定與使用說明。

---

## 目錄

1. [優惠券系統](#1-優惠券系統)
2. [學員評價系統](#2-學員評價系統)
3. [CSV 批次匯入學員](#3-csv-批次匯入學員)
4. [影片浮水印](#4-影片浮水印)
5. [SMTP Email 傳輸](#5-smtp-email-傳輸)
6. [常見問題](#6-常見問題)

---

## 1. 優惠券系統

### 功能概述

建立優惠碼讓學員在結帳時折抵金額或打折，支援：
- 固定金額折扣 或 百分比折扣
- 指定適用課程（或全站通用）
- 使用次數上限、每人使用上限
- 最低消費門檻
- 限首購用戶
- 指定生效/到期時間

### 設定步驟

#### 建立優惠券

1. 登入後台，點擊左側 **「優惠券」**
2. 點擊 **「新增優惠券」**
3. 填寫以下資訊：

| 欄位 | 說明 | 範例 |
|------|------|------|
| 優惠券名稱 | 內部識別用 | 「開站優惠」 |
| 優惠碼 | 學員輸入的代碼（自動轉大寫） | `WELCOME2024` |
| 折扣類型 | 固定金額 / 百分比 | 固定金額 |
| 折抵金額 | 固定金額模式下的折抵數 | 500（元） |
| 百分比折扣 | 百分比模式下的折數 | 20（= 打 8 折） |
| 金額上限 | 百分比折扣的最高折抵額 | 1000（元） |
| 最低消費 | 訂單金額需達此數才能使用 | 2000（元） |
| 使用次數上限 | 0 = 無限 | 100 |
| 每人上限 | 0 = 無限 | 1 |
| 僅限首購 | 只有從未購買過的用戶可用 | 勾選/不勾選 |
| 適用課程 | 留空 = 全站適用 | 選擇特定課程 |
| 生效時間 | 留空 = 立即生效 | 2024-12-01 |
| 到期時間 | 留空 = 永不到期 | 2025-01-31 |

4. 點擊 **「建立優惠券」**

#### 管理優惠券

- **停用**：在優惠券列表中切換「啟用」開關
- **編輯**：點擊優惠券名稱進入編輯頁
- **查看使用情況**：列表中會顯示已兌換次數

#### 學員使用流程

1. 學員在結帳頁面輸入優惠碼
2. 系統自動驗證並顯示折抵金額
3. 付款完成後記錄兌換紀錄

> **注意**：目前結帳頁的優惠碼輸入框尚未整合（需要在 `checkout-client.tsx` 中加入），優惠券的後台管理和 API 驗證端點 (`/api/coupon/validate`) 已就位。如需完整的結帳流程整合，請告訴我。

---

## 2. 學員評價系統

### 功能概述

讓已購買課程的學員留下 1-5 星評價和文字回饋，顯示在銷售頁上增加社會證明。

### 設定步驟

#### 啟用課程評價

1. 登入後台 → **課程管理** → 選擇課程 → **編輯**
2. 找到以下兩個開關（在資料庫中設定）：

| 欄位 | 說明 |
|------|------|
| `enableReviews` | **評價功能總開關** — 開啟後學員才能提交評價 |
| `showReviews` | **銷售頁顯示開關** — 開啟後銷售頁才會顯示評價區塊 |

> **目前設定方式**：這兩個欄位需要在資料庫中直接修改（透過 Prisma Studio 或 Supabase Dashboard）。
>
> ```bash
> # 本地開啟 Prisma Studio
> DATABASE_URL="你的連線字串" pnpm prisma studio
> ```
>
> 在 `Course` 表中找到你的課程，將 `enableReviews` 和 `showReviews` 都設為 `true`。

#### 管理評價

- 後台路徑：`/admin/courses/[課程ID]/reviews`
- 可以：
  - 查看所有評價
  - 隱藏不當評價（設為不可見）
  - 回覆學員評價
  - 查看舉報紀錄

#### 前台顯示

啟用後，評價區塊會自動出現在：
- **預設銷售頁**（`default.tsx`）的課程大綱下方
- 自訂銷售頁需要手動加入（見下方說明）

#### 在自訂銷售頁中加入評價

如果你的課程使用自訂銷售頁（如 `vibe-coding.tsx`），可以手動加入：

```tsx
import { ReviewSection } from '@/components/main/landing/review-section'

// 在元件中加入（放在你想顯示的位置）
{reviewStats && initialReviews && (
  <ReviewSection
    courseId={course.id}
    reviewStats={reviewStats}
    initialReviews={initialReviews}
    initialHasMore={initialHasMore ?? false}
    userReview={userReview ?? null}
    isPurchased={purchaseStatus.isPurchased}
    isLoggedIn={isLoggedIn}
    enableReviews={course.enableReviews ?? false}
    showReviews={course.showReviews ?? false}
    currentUserId={currentUserId}
  />
)}
```

這些 props 已經從課程頁面傳入，所有銷售頁元件都可以使用。

---

## 3. CSV 批次匯入學員

### 功能概述

透過 CSV 檔案一次匯入大量學員，自動建立帳號並授權課程存取。

### 使用步驟

1. 登入後台 → **學員管理**
2. 點擊右上角 **「匯入學員」** 按鈕
3. 選擇要授權的課程
4. 上傳 CSV 檔案（或拖放）
5. 預覽資料，確認無誤後點擊 **「開始匯入」**
6. 查看匯入結果

### CSV 格式要求

| 欄位 | 必填 | 說明 |
|------|------|------|
| 姓名 / Name | 是 | 學員姓名 |
| Email / 電子郵件 | 是 | 學員信箱（作為帳號識別） |
| 電話 / Phone | 否 | 電話號碼 |

#### 範例 CSV

```csv
姓名,Email,電話
王小明,ming@example.com,0912345678
李小華,hua@example.com,
張大偉,david@example.com,0987654321
```

### 匯入邏輯

- **已有帳號的 Email**：不會重新建立帳號，直接授權課程
- **已有課程權限的學員**：自動跳過，不重複授權
- **新 Email**：自動建立帳號（無密碼，可透過 Google/Apple 登入）
- **每次最多**：1,000 筆
- **檔案大小上限**：10MB
- **支援格式**：CSV（相容 Teachify 匯出格式）

> **提示**：對話框中有「下載範本」按鈕，可以下載含正確欄位名稱的 CSV 範本。

---

## 4. 影片浮水印

### 功能概述

在課程影片上顯示浮動浮水印（學員 Email + 課程名稱 + 時間戳記），防止側錄盜版。內建防篡改偵測，如果學員試圖透過 DevTools 隱藏浮水印，影片會自動暫停。

### 設定步驟

浮水印是**按課程設定**的。需要在資料庫 `CourseVideoWatermarkSetting` 表中建立設定。

#### 透過 Supabase Dashboard 設定

1. 開啟 Supabase Dashboard → SQL Editor
2. 執行以下 SQL（替換 `你的課程ID`）：

```sql
INSERT INTO "CourseVideoWatermarkSetting" (
  "id", "courseId", "enabled",
  "showEmail", "showCourseTitle", "showTimestamp",
  "emailDisplayMode", "opacityPercent", "textSize",
  "movementMode", "moveIntervalSec", "tamperPauseEnabled",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  '你的課程ID',
  true,
  true,           -- 顯示學員 Email
  true,           -- 顯示課程名稱
  true,           -- 顯示時間戳記
  'MASKED',       -- Email 顯示模式：FULL（完整）或 MASKED（遮罩如 ab***@domain.com）
  18,             -- 透明度（0-100，數字越小越透明）
  'MD',           -- 文字大小：SM / MD / LG
  'STANDARD',     -- 移動模式：STANDARD（6 點位）或 AGGRESSIVE（8 點位）
  12,             -- 移動間隔秒數
  true,           -- 啟用防篡改（偵測到 DOM 修改時暫停播放）
  NOW(),
  NOW()
);
```

#### 透過 Prisma Studio 設定

```bash
DATABASE_URL="你的連線字串" pnpm prisma studio
```

在 `CourseVideoWatermarkSetting` 表中新增一筆紀錄。

### 設定參數說明

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `enabled` | `false` | 是否啟用浮水印 |
| `showEmail` | `true` | 顯示學員 Email |
| `showCourseTitle` | `true` | 顯示課程名稱 |
| `showTimestamp` | `true` | 顯示觀看時間 |
| `emailDisplayMode` | `FULL` | `FULL`=完整信箱，`MASKED`=部分遮罩 |
| `opacityPercent` | `18` | 透明度百分比（建議 10-25） |
| `textSize` | `MD` | 文字大小（`SM`/`MD`/`LG`） |
| `movementMode` | `STANDARD` | `STANDARD`=6 個位置循環，`AGGRESSIVE`=8 個位置 |
| `moveIntervalSec` | `12` | 每幾秒移動一次位置 |
| `tamperPauseEnabled` | `true` | 偵測 DOM 篡改時自動暫停影片 |

### 運作方式

- 浮水印在影片播放時浮動顯示，每隔指定秒數換位置
- 使用 MutationObserver 監控 DOM 變更
- 偵測到篡改（隱藏、修改透明度、遮擋等）時自動暫停播放
- 浮水印內容包含學員身份資訊，如被側錄可追溯來源

---

## 5. SMTP Email 傳輸

### 功能概述

新增 SMTP 作為 Email 發送的替代方案（除了原有的 Resend SDK）。適合需要使用自己的 Mail Server 或 Gmail SMTP 的情境。

### 目前狀態

`lib/email-transport.ts` 已就位，提供 Resend + SMTP 雙 provider 抽象層。但**目前系統仍使用原有的 `lib/email.ts`（直接 Resend SDK）發送 Email**，尚未切換到新的 transport 層。

### 如果需要啟用 SMTP

1. 在 Supabase Dashboard 的 `SiteSetting` 表中新增以下設定：

| key | value | 說明 |
|-----|-------|------|
| `email_provider` | `smtp` | 切換為 SMTP（預設是 `resend`） |
| `smtp_host` | `smtp.gmail.com` | SMTP 伺服器位址 |
| `smtp_port` | `587` | SMTP 埠號 |
| `smtp_user` | `your@gmail.com` | SMTP 帳號 |
| `smtp_pass` | `your-app-password` | SMTP 密碼 |
| `smtp_secure` | `false` | 是否使用 SSL（587 用 `false`，465 用 `true`） |

2. 修改 `lib/email.ts` 中的發送邏輯，改用 `email-transport.ts` 的 `getEmailTransport()` 函式

> **注意**：這是進階設定。如果你的 Resend 正常運作，不需要切換。未來如果需要完整整合，請告訴我。

---

## 6. 常見問題

### Q: 優惠券在結帳頁面看不到輸入框？

A: 優惠券的後台管理和 API 驗證已就位，但結帳頁面的 UI 整合尚未完成。需要在 `checkout-client.tsx` 中加入優惠碼輸入框。如需完成此項，請告訴我。

### Q: 如何在 Supabase Dashboard 找到課程 ID？

A: 在 Supabase → Table Editor → `Course` 表，第一欄 `id` 即是課程 ID（cuid 格式，如 `cm...`）。

### Q: 評價區塊沒有出現在銷售頁？

A: 確認以下兩點：
1. 課程的 `enableReviews` 和 `showReviews` 都設為 `true`
2. 如果使用自訂銷售頁，需要手動加入 `<ReviewSection>` 元件（見第 2 節說明）

### Q: 浮水印沒有出現？

A: 確認：
1. `CourseVideoWatermarkSetting` 表中有該課程的紀錄，且 `enabled` 為 `true`
2. 學員已登入（浮水印需要 Email 才能顯示）
3. 影片使用 Cloudflare Stream（浮水印覆蓋在 Stream 播放器上方）

### Q: 如何回退這次升級？

A: 本地有備份分支：
```bash
git reset --hard pre-upgrade-backup
git push origin main --force
```
同時需要在 Supabase 中手動移除新增的表和欄位（或回復資料庫備份）。

---

## 附錄：新增的資料庫表

| 表名 | 用途 |
|------|------|
| `Coupon` | 優惠券設定 |
| `CouponRedemption` | 優惠券兌換紀錄 |
| `CourseReview` | 學員評價 |
| `ReviewHelpful` | 評價「有用」投票 |
| `ReviewReport` | 評價舉報 |
| `CourseVideoWatermarkSetting` | 課程浮水印設定 |

## 附錄：新增的後台路由

| 路由 | 說明 |
|------|------|
| `/admin/coupons` | 優惠券列表 |
| `/admin/coupons/new` | 新增優惠券 |
| `/admin/coupons/[id]` | 編輯優惠券 |
| `/admin/courses/[id]/reviews` | 課程評價管理 |

## 附錄：新增的 API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/coupon/validate` | POST | 驗證優惠碼是否有效並計算折扣 |
