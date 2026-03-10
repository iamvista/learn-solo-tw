# PAYUNi API Routes 實作參考

## 建議檔案結構

```
app/api/payment/
├── create/route.ts    # 建立付款
├── return/route.ts    # 付款返回跳轉
└── notify/route.ts    # 背景通知 webhook
public/
└── payuni-redirect.html  # POST 跳轉頁面
```

---

## 1. POST /api/payment/create

職責：驗證請求 → 建立訂單 → 加密 → 回傳表單資料

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getPayUniService } from "@/lib/payment/settings";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 1. Zod 驗證請求資料
    // 2. Prisma Transaction：驗證庫存/價格 → 建立訂單 → 扣減庫存

    const payUniService = await getPayUniService();
    const orderNumber = payUniService.generateTradeNo();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // 3. 產生加密表單資料
    const formData = payUniService.createFormData({
      MerTradeNo: orderNumber,
      TradeAmt: Math.round(total),
      ProdDesc: productDescription.substring(0, 100),
      ReturnURL: `${baseUrl}/api/payment/return`,
      NotifyURL: `${baseUrl}/api/payment/notify`,
      UsrMail: email,
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      formData: { ...formData, apiUrl: payUniService.getApiUrl() },
    });
  } catch (error) {
    console.error("Create order error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "建立訂單失敗" }, { status: 500 });
  }
}
```

**重點：**
- `TradeAmt` 必須用 `Math.round()` 取整數
- `ProdDesc` 限制 100 字元以內
- 庫存扣減使用條件更新防止超售：
  ```typescript
  const result = await tx.model.updateMany({
    where: { id: item.id, stock: { gte: item.quantity } },
    data: { stock: { decrement: item.quantity } },
  });
  if (result.count === 0) throw new Error("庫存不足");
  ```

---

## 2. POST /api/payment/return

職責：接收 PAYUNi 跳轉 → 解密 → Redirect 到成功/失敗頁

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    const formData = await request.formData();
    const encryptInfo = formData.get("EncryptInfo")?.toString();
    const hashInfo = formData.get("HashInfo")?.toString();

    if (!encryptInfo || !hashInfo) {
      return NextResponse.redirect(new URL("/checkout/failed", baseUrl), 303);
    }

    const { getPayUniService } = await import("@/lib/payment/settings");
    const payUniService = await getPayUniService();
    const decrypted = payUniService.verifyAndDecrypt(encryptInfo, hashInfo);

    const orderNumber = decrypted.MerTradeNo as string;
    const status = decrypted.Status as string;

    if (!orderNumber) throw new Error("Missing order number");

    if (status === "SUCCESS") {
      return NextResponse.redirect(
        new URL(`/checkout/success?orderNumber=${orderNumber}`, baseUrl), 303
      );
    } else {
      return NextResponse.redirect(
        new URL(`/checkout/failed?orderNumber=${orderNumber}`, baseUrl), 303
      );
    }
  } catch (error) {
    console.error("Payment return error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    return NextResponse.redirect(new URL("/checkout/failed", baseUrl), 303);
  }
}
```

**重點：**
- PAYUNi 用 POST form-urlencoded 跳轉，所以用 `request.formData()`
- Redirect 必須用 **303**（POST → GET）

---

## 3. POST /api/payment/notify

職責：接收背景通知 → 驗證 → 更新訂單狀態（最重要的 endpoint）

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayUniService } from "@/lib/payment/settings";
import { type PayUniResponse } from "@/lib/payment/payuni";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const EncryptInfo = formData.get("EncryptInfo") as string | null;
    const HashInfo = formData.get("HashInfo") as string | null;

    if (!EncryptInfo || !HashInfo) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const payUniService = await getPayUniService();

    // 驗證並解密
    let decryptedData: PayUniResponse;
    try {
      decryptedData = payUniService.verifyAndDecrypt(EncryptInfo, HashInfo);
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const merTradeNo = decryptedData.MerTradeNo as string;
    const status = decryptedData.Status as string;
    const tradeAmt = Number(decryptedData.TradeAmt || 0);

    // 查詢訂單
    const order = await prisma.order.findUnique({
      where: { orderNumber: merTradeNo },
      select: { total: true, paymentStatus: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 金額驗證
    const expectedAmount = Math.round(Number(order.total));
    if (tradeAmt !== expectedAmount) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // 冪等性：已處理的訂單直接返回
    if (order.paymentStatus !== "PENDING") {
      return NextResponse.json({ message: "OK" });
    }

    // 更新訂單狀態（樂觀鎖：只更新 PENDING 狀態）
    const newStatus = payUniService.isTradeSuccess(status) ? "PAID" : "FAILED";

    const result = await prisma.order.updateMany({
      where: { orderNumber: merTradeNo, paymentStatus: "PENDING" },
      data: {
        paymentStatus: newStatus,
        paidAt: newStatus === "PAID" ? new Date() : null,
      },
    });

    // 付款成功後的後續處理（非阻塞）
    if (newStatus === "PAID" && result.count > 0) {
      // 發送確認郵件、建立 Purchase 記錄等
    }

    return NextResponse.json({ message: "OK" });
  } catch (error) {
    console.error("Payment notify error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

**重點：**
- **金額驗證**：防止金額被竄改
- **冪等性**：`updateMany` + `where: { paymentStatus: "PENDING" }` 確保不重複處理
- 後續處理（郵件等）不應阻塞 response

---

## 4. 跳轉頁面 public/payuni-redirect.html

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>跳轉至付款頁面...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .spinner {
      border: 4px solid rgba(255,255,255,0.3);
      border-radius: 50%; border-top: 4px solid white;
      width: 60px; height: 60px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1.5rem;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h1>正在跳轉至付款頁面</h1>
    <p>請稍候，系統正在處理您的訂單...</p>
  </div>

  <form id="paymentForm" method="POST" style="display: none;">
    <input type="hidden" name="MerID" id="MerID">
    <input type="hidden" name="Version" id="Version">
    <input type="hidden" name="EncryptInfo" id="EncryptInfo">
    <input type="hidden" name="HashInfo" id="HashInfo">
  </form>

  <script>
    (function() {
      try {
        var p = new URLSearchParams(window.location.search);
        var apiUrl = p.get('apiUrl');
        var merID = p.get('MerID');
        var version = p.get('Version');
        var encryptInfo = p.get('EncryptInfo');
        var hashInfo = p.get('HashInfo');

        if (!apiUrl || !merID || !encryptInfo || !hashInfo) {
          throw new Error('缺少必要的付款參數');
        }

        document.getElementById('MerID').value = merID;
        document.getElementById('Version').value = version || '1.0';
        document.getElementById('EncryptInfo').value = decodeURIComponent(encryptInfo);
        document.getElementById('HashInfo').value = decodeURIComponent(hashInfo);

        var form = document.getElementById('paymentForm');
        form.action = apiUrl;
        setTimeout(function() { form.submit(); }, 500);
      } catch (e) {
        console.error('Payment redirect error:', e);
        document.querySelector('.container').innerHTML =
          '<h1>發生錯誤</h1><p>' + e.message + '</p><a href="/" style="color:white">返回首頁</a>';
      }
    })();
  </script>
</body>
</html>
```

---

## 5. 設定管理（從 DB 取得設定的範例）

```typescript
import { prisma } from "@/lib/prisma";
import { createPayUniServiceFromSettings, PayUniService } from "./payuni";

export async function getPayUniService(): Promise<PayUniService> {
  const config = await prisma.shopConfig.findUnique({
    where: { key: "payments" },
  });

  if (!config) throw new Error("付款設定尚未設定");

  const settings = config.value as any;
  if (!settings.payuni?.enabled) throw new Error("PAYUNi 金流尚未啟用");

  return createPayUniServiceFromSettings(settings);
}
```

若使用環境變數：

```typescript
export function getPayUniService(): PayUniService {
  return new PayUniService({
    merchantId: process.env.PAYUNI_MERCHANT_ID!,
    hashKey: process.env.PAYUNI_HASH_KEY!,
    hashIV: process.env.PAYUNI_HASH_IV!,
    apiUrl: process.env.PAYUNI_TEST_MODE === "true"
      ? "https://sandbox-api.payuni.com.tw/api/upp"
      : "https://api.payuni.com.tw/api/upp",
  });
}
```
