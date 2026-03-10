---
name: stripe-integration
description: Stripe 金流串接指南。協助在專案中串接 Stripe 付款功能，包含 Checkout Session、webhook、訂閱、Connect 等。Use when the user mentions "串接 Stripe," "Stripe," "stripe payment," "Stripe 付款," "Stripe 結帳," "Stripe webhook," "Stripe subscription," "Stripe Connect," or needs to implement Stripe payment processing.
---

# Stripe 金流串接

## 第一步：取得最新官方文件

**每次觸發此 Skill 時，必須先使用 `WebFetch` 工具抓取 Stripe 官方 LLM 文件：**

```
URL: https://docs.stripe.com/llms.txt
```

這份文件包含 Stripe 最新的 API 文件、最佳實踐、程式碼範例，且會隨 Stripe 更新而變動。抓取後根據用戶的具體需求，從文件中找到對應的指引來實作。

## 第二步：根據需求實作

拿到文件後，根據用戶的需求場景進行實作：

| 場景 | 關鍵字 |
|------|--------|
| 一次性付款 | Checkout Session, Payment Intent |
| 訂閱制 | Subscription, Recurring |
| 平台抽成 | Stripe Connect |
| 付款後處理 | Webhook, Event |
| 客戶入口 | Customer Portal |

## 實作注意事項

1. **Webhook 驗證** — 必須用 `stripe.webhooks.constructEvent()` 驗證簽名，不可跳過
2. **冪等性** — webhook 可能重複發送，用 event ID 或訂單狀態做冪等處理
3. **金鑰安全** — `STRIPE_SECRET_KEY` 只在 server 端使用，前端只用 `STRIPE_PUBLISHABLE_KEY`
4. **測試模式** — 使用 `sk_test_` / `pk_test_` 開頭的金鑰進行開發測試
