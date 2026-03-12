# PAYUNi AES-256-GCM 加解密

## PHP ↔ Node.js 對照

| 步驟 | PHP SDK | Node.js |
|------|---------|---------|
| 原始資料 | `http_build_query($data)` | `new URLSearchParams(data).toString()` |
| 加密 | `openssl_encrypt(..., 'aes-256-gcm', ...)` | `crypto.createCipheriv('aes-256-gcm', ...)` |
| 輸出格式 | Base64 (預設) | `cipher.update(..., 'utf8', 'base64')` |
| 組合格式 | `$encrypted . ':::' . base64_encode($tag)` | `encrypted + ':::' + tag.toString('base64')` |
| 最終輸出 | `bin2hex(...)` | `Buffer.from(..., 'utf8').toString('hex')` |

## 加密資料格式圖解

```
原始資料 (Query String):
MerID=U00000000&MerTradeNo=ORD123&TradeAmt=100&Timestamp=1702...

    ↓ AES-256-GCM 加密

加密結果 (Base64) + 認證標籤 (Base64)

    ↓ 組合 (用 ::: 分隔)

a1b2c3d4...==:::x9y8z7...==

    ↓ bin2hex

最終 EncryptInfo: 613162326333643465...
```

## 完整 PayUniService 類別

```typescript
import crypto from "crypto";

interface PayUniConfig {
  merchantId: string;
  hashKey: string;   // 必須 32 字元
  hashIV: string;    // 必須 16 字元
  apiUrl?: string;
}

export interface PayUniTradeData {
  MerID: string;
  MerTradeNo: string;
  TradeAmt: number;
  ProdDesc: string;
  ReturnURL: string;
  NotifyURL: string;
  UsrMail?: string;
  ExpireDate?: string;
  [key: string]: unknown;
}

export interface PayUniFormData {
  MerID: string;
  Version: string;
  EncryptInfo: string;
  HashInfo: string;
}

export interface PayUniResponse {
  Status: string;
  Message: string;
  TradeNo?: string;
  TradeAmt?: number;
  MerTradeNo?: string;
  PaymentType?: string;
  [key: string]: unknown;
}

export class PayUniService {
  private config: PayUniConfig;
  private readonly version = "1.0";
  private readonly apiUrl: string;

  constructor(config: PayUniConfig) {
    if (config.hashKey.length !== 32) {
      throw new Error(`HashKey must be exactly 32 characters, got ${config.hashKey.length}`);
    }
    if (config.hashIV.length !== 16) {
      throw new Error(`HashIV must be exactly 16 characters, got ${config.hashIV.length}`);
    }
    this.config = config;
    this.apiUrl = config.apiUrl || "https://sandbox-api.payuni.com.tw/api/upp";
  }

  /** 將物件轉為 query string（模擬 PHP http_build_query） */
  private buildQueryString(data: Record<string, unknown>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value));
      }
    }
    return params.toString();
  }

  /**
   * AES-256-GCM 加密
   * 格式必須與 PAYUNi PHP SDK 一致：bin2hex(base64加密資料 + ':::' + base64(tag))
   */
  encrypt(data: string): { encryptInfo: string; hashInfo: string } {
    const { hashKey, hashIV } = this.config;

    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      Buffer.from(hashKey, "utf8"),
      Buffer.from(hashIV, "utf8")
    );

    let encrypted = cipher.update(data, "utf8", "base64");
    encrypted += cipher.final("base64");

    const tag = cipher.getAuthTag();
    const tagBase64 = tag.toString("base64");

    const combined = encrypted + ":::" + tagBase64;
    const encryptInfo = Buffer.from(combined, "utf8").toString("hex");

    const hashInfo = crypto
      .createHash("sha256")
      .update(hashKey + encryptInfo + hashIV)
      .digest("hex")
      .toUpperCase();

    return { encryptInfo, hashInfo };
  }

  /** AES-256-GCM 解密 */
  decrypt(encryptInfo: string): string {
    const { hashKey, hashIV } = this.config;

    const combined = Buffer.from(encryptInfo, "hex").toString("utf8");
    const parts = combined.split(":::");
    const encrypted = parts[0] ?? "";
    const tagBase64 = parts[1] ?? "";

    if (!encrypted || !tagBase64) {
      throw new Error("Invalid encrypted data format");
    }

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      Buffer.from(hashKey, "utf8"),
      Buffer.from(hashIV, "utf8")
    );

    decipher.setAuthTag(Buffer.from(tagBase64, "base64"));

    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /** 產生訂單編號：ORD + YYYYMMDD + 時間戳後6位 + 6位隨機數 = 23 字元 */
  generateTradeNo(): string {
    const now = new Date();
    const dateStr =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0");
    const timeStr = Date.now().toString().slice(-6);
    const randomBytes = crypto.randomBytes(3);
    const random = (
      (randomBytes[0]! << 16) +
      (randomBytes[1]! << 8) +
      randomBytes[2]!
    )
      .toString()
      .slice(-6)
      .padStart(6, "0");
    return `ORD${dateStr}${timeStr}${random}`;
  }

  /** 建立表單提交資料（用於前端 POST 到 PAYUNi） */
  createFormData(tradeData: Omit<PayUniTradeData, "MerID">): PayUniFormData {
    const fullTradeData: Record<string, unknown> = {
      MerID: this.config.merchantId,
      Timestamp: Math.floor(Date.now() / 1000),
      ...tradeData,
    };

    const queryString = this.buildQueryString(fullTradeData);
    const { encryptInfo, hashInfo } = this.encrypt(queryString);

    return {
      MerID: this.config.merchantId,
      Version: this.version,
      EncryptInfo: encryptInfo,
      HashInfo: hashInfo,
    };
  }

  /** 驗證並解密回傳資料 */
  verifyAndDecrypt(
    encryptInfo: string,
    hashInfo: string,
    options: { maxAgeSeconds?: number } = {}
  ): PayUniResponse {
    const { hashKey, hashIV } = this.config;

    // 驗證 HashInfo
    const expectedHash = crypto
      .createHash("sha256")
      .update(hashKey + encryptInfo + hashIV)
      .digest("hex")
      .toUpperCase();

    if (expectedHash !== hashInfo.toUpperCase()) {
      throw new Error("Hash verification failed");
    }

    const decrypted = this.decrypt(encryptInfo);
    const params = new URLSearchParams(decrypted);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });

    // Timestamp 時效驗證：防止 Replay Attack
    const maxAgeSeconds = options.maxAgeSeconds ?? 300;
    const timestamp = result.Timestamp;
    if (timestamp) {
      const requestTime = parseInt(timestamp, 10) * 1000;
      const now = Date.now();
      const age = Math.abs(now - requestTime);
      if (age > maxAgeSeconds * 1000) {
        throw new Error(
          `Timestamp expired: request is ${Math.round(age / 1000)} seconds old`
        );
      }
    }

    return result as unknown as PayUniResponse;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  isTradeSuccess(status: string): boolean {
    return status === "SUCCESS";
  }
}

// ============ 工廠函數 ============

export interface PaymentSettingsFromDB {
  payuni: {
    enabled: boolean;
    merchantId: string;
    hashKey: string;
    hashIV: string;
    testMode: boolean;
    methods: {
      credit: boolean;
      atm: boolean;
      cvs: boolean;
    };
  };
}

export function createPayUniServiceFromSettings(
  settings: PaymentSettingsFromDB
): PayUniService {
  const { merchantId, hashKey, hashIV, testMode } = settings.payuni;

  if (!merchantId || !hashKey || !hashIV) {
    throw new Error("PAYUNi 設定不完整，請至後臺設定商店代號、Hash Key 和 Hash IV");
  }

  const apiUrl = testMode
    ? "https://sandbox-api.payuni.com.tw/api/upp"
    : "https://api.payuni.com.tw/api/upp";

  return new PayUniService({ merchantId, hashKey, hashIV, apiUrl });
}
```
