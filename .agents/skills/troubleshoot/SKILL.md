---
name: troubleshoot
description: >
  診斷和修復課程平臺的常見開發問題。
  Use when: 用戶說「出錯了」、「報錯」、「無法啟動」、「build 失敗」、「頁面壞了」、
  「登入有問題」、「付款失敗」、「影片無法播放」、「troubleshoot」、「debug」、
  「為什麼不能...」、「怎麼修」、或描述任何錯誤訊息。
  涵蓋環境設定、資料庫、認證、金流、影片串流等常見問題。
---

# Troubleshoot

## 快速診斷流程

1. 確認錯誤訊息或症狀
2. 對照下方分類找到可能原因
3. 依建議步驟修復

詳細的問題分類見 [references/common-issues.md](references/common-issues.md)。

## 關鍵檔案速查

| 用途 | 檔案路徑 |
|------|----------|
| 環境變數範本 | `.env.example` |
| 資料庫 Schema | `prisma/schema.prisma` |
| 認證設定 | `lib/auth.ts` + `lib/auth.config.ts` |
| 路由保護 | `middleware.ts` |
| 金流工具 | `lib/payuni.ts` |
| 影片串流 | `lib/cloudflare.ts` |
| CSS 變數 | `app/globals.css` |
| 銷售頁載入器 | `components/main/landing/pages/loader.ts` |

## 診斷工具

```bash
pnpm prisma db pull     # 檢查資料庫連線
pnpm prisma studio      # 檢視資料庫內容
pnpm build              # 檢查 build 錯誤
pnpm lint               # 檢查 lint 錯誤
pnpm admin:init <email> # 升級用戶為管理員
```
