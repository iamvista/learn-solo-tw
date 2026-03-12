---
name: payuni-integration
description: PAYUNi 統一金流串接指南。在 Next.js (App Router) + TypeScript 專案中串接 PAYUNi 付款功能，涵蓋 AES-256-GCM 加解密、API Routes、webhook 處理。Use when the user mentions "串接金流," "PAYUNi," "payuni," "付款功能," "結帳功能," "金流串接," "payment integration," or needs to implement PAYUNi payment processing.
---

# PAYUNi 統一金流串接

## 整體流程

1. 後端建立訂單 → 加密交易資料 → 回傳表單資料給前端
2. 前端透過靜態 HTML POST 表單到 PAYUNi（繞過跨域）
3. 使用者在 PAYUNi 完成付款
4. PAYUNi 背景 Notify webhook 通知 + Return 跳轉使用者

## 前置準備

從 PAYUNi 商家後臺取得：
- **MerID**: 商店代號（如 `U00000000`）
- **Hash Key**: 32 字元
- **Hash IV**: 16 字元

| 環境 | API URL |
|------|---------|
| 測試 | `https://sandbox-api.payuni.com.tw/api/upp` |
| 正式 | `https://api.payuni.com.tw/api/upp` |

測試卡號：`4147631000000001`（有效期限/CVV 任意填）

## 實作步驟

### Step 1: 確認需求

向用戶確認：設定存放方式（env / DB）、付款方式（信用卡/ATM/超商）、Return/Notify URL 路徑。

### Step 2: 建立加解密服務

核心為 AES-256-GCM 加解密。加解密格式必須與 PAYUNi PHP SDK 一致。

詳細程式碼與 PHP 對照表見 [references/encryption.md](references/encryption.md)。

### Step 3: 建立 API Routes

需要三個 endpoint：

| Endpoint | 職責 |
|----------|------|
| `POST /api/payment/create` | 驗證 → 建立訂單 → 加密 → 回傳表單資料 |
| `POST /api/payment/return` | 接收 PAYUNi 跳轉 → 解密 → Redirect 303 |
| `POST /api/payment/notify` | 接收背景通知 → 驗證 → 更新訂單狀態 |

各 endpoint 的詳細實作見 [references/api-routes.md](references/api-routes.md)。

### Step 4: 建立跳轉頁面

在 `public/payuni-redirect.html` 建立靜態 HTML，從 URL params 讀取表單資料並自動 POST 到 PAYUNi。

### Step 5: 前端結帳邏輯

```typescript
const redirectUrl = new URL("/payuni-redirect.html", window.location.origin);
redirectUrl.searchParams.set("apiUrl", formData.apiUrl);
redirectUrl.searchParams.set("MerID", formData.MerID);
redirectUrl.searchParams.set("Version", formData.Version);
redirectUrl.searchParams.set("EncryptInfo", encodeURIComponent(formData.EncryptInfo));
redirectUrl.searchParams.set("HashInfo", encodeURIComponent(formData.HashInfo));
window.location.href = redirectUrl.toString();
```

## 安全機制 Checklist

實作時務必包含：
1. **Hash 驗證** — `SHA256(HashKey + EncryptInfo + HashIV).toUpperCase()`
2. **金額驗證** — 比對回傳金額與訂單金額
3. **冪等性** — `updateMany` + `where: { paymentStatus: "PENDING" }`
4. **Timestamp 驗證** — 5 分鐘內有效，防 Replay Attack
5. **Rate Limiting** — 防訂單濫發

## 常見錯誤

| 錯誤 | 原因 | 解法 |
|------|------|------|
| Hash verification failed | Key/IV 長度錯 | Key=32, IV=16 字元 |
| PAYUNi 參數錯誤 | testMode 與金鑰不匹配 | 測試環境用測試金鑰 |
| 付款後沒跳轉 | ReturnURL 不可達 | 用 ngrok 或公開伺服器 |
| Amount mismatch | 金額不一致 | 檢查計算與四捨五入 |

## 參考資料

- [references/encryption.md](references/encryption.md) — 加解密完整程式碼與 PHP 對照
- [references/api-routes.md](references/api-routes.md) — 三個 API endpoint 的完整實作
- [PAYUNi PHP SDK](https://github.com/payuni/PHP_SDK)
- [PAYUNi API 文件](https://docs.payuni.com.tw/web/#/7/24)
