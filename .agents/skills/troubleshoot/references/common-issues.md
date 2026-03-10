# 常見問題分類

## 環境與啟動

| 症狀 | 原因 | 修復 |
|------|------|------|
| `pnpm dev` 失敗 | 未安裝依賴 | `pnpm install` |
| Prisma Client 錯誤 | 未產生 Client | `pnpm prisma generate` |
| `DATABASE_URL` 錯誤 | `.env` 未設定或格式錯誤 | 檢查 `.env` 的 PostgreSQL 連接字串 |
| Schema 不同步 | Model 修改後未推送 | `pnpm prisma db push` |
| Build 失敗 "Cannot find module" | 路徑別名問題 | 確認使用 `@/*` 且 `tsconfig.json` 正確 |

## 認證問題

| 症狀 | 原因 | 修復 |
|------|------|------|
| 登入後無限重導 | `AUTH_URL` 未設定或不匹配 | `.env` 設定 `AUTH_URL=http://localhost:3000` |
| Google 登入失敗 | OAuth Client ID/Secret 錯誤 | 檢查 `AUTH_GOOGLE_ID` 和 `AUTH_GOOGLE_SECRET` |
| Apple 登入失敗 | Apple 開發者設定問題 | 檢查 `AUTH_APPLE_*` 相關變數 |
| "CSRF token mismatch" | `AUTH_SECRET` 未設定 | `openssl rand -base64 32` 產生並設定 |
| 已登入卻被擋 | Middleware 角色檢查 | 確認用戶角色：`pnpm admin:init <email>` |

## 頁面與路由

| 症狀 | 原因 | 修復 |
|------|------|------|
| 銷售頁顯示預設版 | 未在 `loader.ts` 註冊 | 在 `components/main/landing/pages/loader.ts` 新增 slug 對應 |
| 404 頁面 | 路由不存在或 slug 錯誤 | 檢查 `app/` 目錄結構和課程 slug |
| `/admin` 被擋 | 角色不足 | 需要 ADMIN 或 EDITOR 角色 |
| 課程內容頁被導向登入 | Middleware 保護 | `/courses/[slug]/lessons/*` 需登入，這是預期行為 |

## 資料庫問題

| 症狀 | 原因 | 修復 |
|------|------|------|
| "Table does not exist" | Schema 未同步 | `pnpm prisma db push` |
| "Unique constraint failed" | 重複資料 | 檢查唯一欄位（email、slug 等） |
| 連線逾時 | DB 未啟動或連線數滿 | 檢查 PostgreSQL 服務狀態和連線池 |
| 查詢結果為空 | 資料未建立或 filter 條件錯誤 | `pnpm prisma studio` 檢查資料 |

## 金流問題

| 症狀 | 原因 | 修復 |
|------|------|------|
| 付款後訂單未更新 | Webhook 未收到 | 檢查 webhook URL 和環境變數 |
| "Invalid signature" | 加密金鑰錯誤 | 檢查 PayUni/Stripe 金鑰設定 |
| 結帳頁空白 | 課程 ID 錯誤 | 確認 URL `?courseId=` 參數正確 |

## 影片串流

| 症狀 | 原因 | 修復 |
|------|------|------|
| 影片無法播放 | Signed URL 過期或 Stream 設定錯誤 | 檢查 `CLOUDFLARE_*` 環境變數 |
| 上傳失敗 | TUS 協議設定或 CORS 問題 | 檢查 Cloudflare Stream API Token 權限 |
| 影片進度不記錄 | API 端點錯誤 | 檢查 `/api/lesson-progress` 是否正常回應 |

## 樣式問題

| 症狀 | 原因 | 修復 |
|------|------|------|
| 樣式完全消失 | Tailwind 設定問題 | 檢查 `postcss.config.mjs` 和 `app/globals.css` |
| 品牌色不對 | CSS 變數未設定 | 編輯 `app/globals.css` 中的 `--primary` 等變數 |
| shadcn 元件樣式異常 | 版本不匹配 | 確認 `components.json` 設定正確 |
