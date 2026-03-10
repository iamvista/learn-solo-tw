# 線上課程販售平台

一套完整的線上課程販售解決方案，使用 Next.js 15 + Prisma 7 建構。支援課程管理、影片串流、金流付款、學員管理，開箱即用。

## 功能特色

- **課程管理** — 建立課程、章節、單元，支援拖曳排序
- **影片串流** — Cloudflare Stream 整合，支援 TUS 上傳與 Signed URL 播放
- **金流付款** — PayUni 金流整合，支援信用卡付款
- **學員系統** — Google/Apple/Email 登入，購買記錄，觀看進度追蹤
- **銷售頁** — 支援 React 元件或自訂 HTML，可透過 AI 快速生成專屬銷售頁
- **後台管理** — Dashboard 統計、訂單管理、學員管理、媒體中心
- **SEO 優化** — 結構化資料（JSON-LD）、OG 標籤、自訂 SEO 設定

## 技術棧

| 類別 | 技術 |
|------|------|
| Framework | Next.js 15 (App Router) + React 19 |
| Database | PostgreSQL + Prisma 7 |
| Auth | NextAuth v5 (Google, Apple, Credentials) |
| UI | Tailwind CSS v4 + shadcn/ui |
| Payment | PayUni 金流 |
| Media | Cloudflare Stream (影片) + R2 (圖片) |
| Email | Resend |

## 快速開始

### 1. 安裝依賴

```bash
pnpm install
```

### 2. 設定環境變數

```bash
cp .env.example .env.local
```

詳細的環境變數設定請參考下方[環境變數設定指南](#環境變數設定指南)。

### 3. 資料庫設定

```bash
pnpm prisma generate
pnpm prisma db push
```

### 4. 啟動開發伺服器

```bash
pnpm dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看結果。

### 5. 初始化管理員

先以 Google/Apple/Email 註冊一個帳號，然後執行：

```bash
pnpm admin:init <你的email>
```

## 使用 AI 開發

本專案深度整合 [Claude Code](https://claude.com/claude-code)，內建多個 Skill 加速開發：

### 建立課程銷售頁

每個課程都可以擁有完全客製化的銷售頁。最快的方式是直接跟 AI 說：

> 「替 `my-course-slug` 課程建立一個專屬銷售頁」

AI 會自動建立 React 元件、註冊到系統、並根據課程性質設計版面。

### 銷售頁模式

在後台「課程管理 → 課程資訊 → 銷售頁設定」中，可選擇：

- **React 元件**（推薦）— 使用 React 元件，最大化設計彈性
- **自訂 HTML** — 直接貼入 HTML，適合快速上線或外部設計稿

## 專案結構

```
├── app/
│   ├── (admin)/admin/      # 後台頁面
│   ├── (auth)/              # 認證頁面
│   ├── (main)/              # 前台頁面
│   ├── (setup)/             # 初始設定
│   └── api/                 # API Routes
├── components/
│   ├── admin/               # 後台元件
│   ├── main/                # 前台元件
│   │   └── landing/         # 銷售頁系統
│   │       └── pages/       # 各課程銷售頁元件
│   ├── ui/                  # shadcn/ui 元件
│   └── layouts/             # Layout 元件
├── lib/
│   ├── actions/             # Server Actions
│   ├── validations/         # Zod 驗證規則
│   ├── auth.ts              # NextAuth 配置
│   ├── prisma.ts            # Prisma Client
│   ├── payuni.ts            # PayUni 金流工具
│   └── cloudflare.ts        # Cloudflare API
├── prisma/
│   └── schema.prisma        # 資料庫 Schema
├── hooks/                   # Custom Hooks
└── types/                   # TypeScript 型別
```

## 常用指令

```bash
pnpm dev                    # 開發伺服器
pnpm build                  # Production 建置
pnpm lint                   # ESLint 檢查
pnpm prisma generate        # 產生 Prisma Client
pnpm prisma db push         # 同步 Schema
pnpm prisma studio          # 資料庫 GUI
pnpm admin:init <email>     # 升級為管理員
```

## 環境變數設定指南

### 必要設定

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/course_platform"

# NextAuth
AUTH_SECRET="your-secret-key"      # 產生方式: openssl rand -base64 32
AUTH_URL="https://your-domain.com"

# App Settings
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NEXT_PUBLIC_APP_NAME="你的課程平台名稱"
```

### Google OAuth

```env
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
```

設定步驟：
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立 OAuth Client ID（Web application）
3. 新增 Redirect URI：`https://your-domain.com/api/auth/callback/google`

### Apple OAuth

```env
AUTH_APPLE_ID="your-apple-client-id"
AUTH_APPLE_SECRET="your-apple-client-secret"
```

設定步驟：
1. 前往 [Apple Developer Portal](https://developer.apple.com/)
2. 建立 Services ID 並啟用 Sign in with Apple
3. 設定 Return URL：`https://your-domain.com/api/auth/callback/apple`

### PayUni 金流

```env
PAYUNI_MERCHANT_ID="your-merchant-id"
PAYUNI_HASH_KEY="your-hash-key"
PAYUNI_HASH_IV="your-hash-iv"
PAYUNI_API_URL="https://sandbox-api.payuni.com.tw"  # 測試環境
# PAYUNI_API_URL="https://api.payuni.com.tw"         # 正式環境
```

測試卡號：`4000-2211-1111-1111`（成功）、`4000-2222-2222-2222`（失敗）

### Cloudflare Stream / R2

```env
CLOUDFLARE_ACCOUNT_ID="your-account-id"
CLOUDFLARE_API_TOKEN="your-api-token"
NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID="your-account-id"

# R2
CLOUDFLARE_R2_ACCESS_KEY_ID="your-access-key-id"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-secret-access-key"
CLOUDFLARE_R2_BUCKET_NAME="your-bucket-name"
CLOUDFLARE_R2_PUBLIC_URL="https://media.your-domain.com"
```

### Email (Resend)

```env
RESEND_API_KEY="re_xxxxx"
EMAIL_FROM="noreply@your-domain.com"
```

## 本地開發測試金流

PayUni 需要公開 URL 接收 webhook，本地測試需使用 ngrok：

```bash
ngrok http 3000
```

將 ngrok URL 設定到 `NEXT_PUBLIC_APP_URL` 和 `AUTH_URL`，並在 Google Cloud Console 新增 ngrok URL 到 Redirect URI。

## License

Private - All Rights Reserved
