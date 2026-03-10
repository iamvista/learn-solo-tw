// lib/cloudflare.ts
// Cloudflare API 封裝
// 包含 Stream (影片) 和 R2 (圖片/檔案) 的操作

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

// ==================== Cloudflare Stream API ====================

/**
 * Stream Direct Creator Upload 回應
 */
export interface StreamUploadResponse {
  success: boolean;
  uploadURL?: string;
  uid?: string;
  error?: string;
}

/**
 * Stream 影片資訊
 */
export interface StreamVideoInfo {
  uid: string;
  thumbnail: string;
  preview: string;
  readyToStream: boolean;
  status: {
    state: string;
    pctComplete?: string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  meta?: {
    name?: string;
  };
  duration?: number;
  created?: string;
  modified?: string;
  size?: number;
}

/**
 * 取得 Cloudflare Stream Direct Creator Upload URL
 * 用於前端直接上傳影片到 Cloudflare Stream
 */
export async function getStreamUploadUrl(): Promise<StreamUploadResponse> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return {
      success: false,
      error: "缺少 Cloudflare 設定",
    };
  }

  try {
    // Cloudflare Stream Direct Creator Upload API
    // 參考: https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxDurationSeconds: 3600, // 1 小時
        }),
      }
    );

    const data = await response.json();

    if (!data.success) {
      console.error(
        "Cloudflare Stream API 錯誤:",
        JSON.stringify(data, null, 2)
      );
      const errorMessage =
        data.errors?.[0]?.message || data.messages?.[0] || "無法取得上傳 URL";
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      uploadURL: data.result.uploadURL,
      uid: data.result.uid,
    };
  } catch (error) {
    console.error("取得 Stream 上傳 URL 失敗:", error);
    return {
      success: false,
      error: "取得上傳 URL 時發生錯誤",
    };
  }
}

/**
 * 取得 Cloudflare Stream 影片資訊
 */
export async function getStreamVideoInfo(
  videoId: string
): Promise<StreamVideoInfo | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    const data = await response.json();

    if (!data.success) {
      return null;
    }

    return data.result;
  } catch (error) {
    console.error("取得影片資訊失敗:", error);
    return null;
  }
}

/**
 * 刪除 Cloudflare Stream 影片
 */
export async function deleteStreamVideo(
  videoId: string
): Promise<{ success: boolean; error?: string }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return {
      success: false,
      error: "缺少 Cloudflare 設定",
    };
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    // Cloudflare DELETE API 成功時可能返回空回應 (200/204)
    if (response.ok) {
      return { success: true };
    }

    // 嘗試解析錯誤訊息
    const text = await response.text();
    if (text) {
      try {
        const data = JSON.parse(text);
        return {
          success: false,
          error: data.errors?.[0]?.message || "刪除影片失敗",
        };
      } catch {
        // JSON 解析失敗，使用 HTTP 狀態碼
      }
    }

    return {
      success: false,
      error: `刪除影片失敗 (HTTP ${response.status})`,
    };
  } catch (error) {
    console.error("刪除影片失敗:", error);
    return {
      success: false,
      error: "刪除影片時發生錯誤",
    };
  }
}

/**
 * 取得 Cloudflare Stream 影片播放 URL
 */
export function getStreamPlaybackUrl(videoId: string): string {
  return `https://customer-${
    process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE || "xxx"
  }.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
}

/**
 * 取得 Cloudflare Stream 影片縮圖 URL
 */
export function getStreamThumbnailUrl(videoId: string): string {
  return `https://customer-${
    process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE || "xxx"
  }.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`;
}

/**
 * 產生 Cloudflare Stream 簽名 URL
 * 使用 HMAC-SHA256 簽名，確保影片只能由授權用戶觀看
 * @param videoId - Cloudflare Stream 影片 ID
 * @param expiresIn - URL 有效期（秒），預設 2 小時
 * @returns 簽名後的 iframe URL，若缺少設定則返回 null
 */
export function generateSignedStreamUrl(
  videoId: string,
  expiresIn: number = 7200 // 2 小時
): string | null {
  const signingSecret = process.env.CLOUDFLARE_STREAM_SIGNING_SECRET;
  const customerCode = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE;

  if (!signingSecret || !customerCode) {
    console.error("缺少 Cloudflare Stream 簽名設定");
    return null;
  }

  // 計算過期時間戳（Unix timestamp）
  const expireTimestamp = Math.floor(Date.now() / 1000) + expiresIn;

  // 簽名內容：videoId/expireTimestamp
  const signatureContent = `${videoId}/${expireTimestamp}`;

  // 使用 HMAC-SHA256 產生簽名
  const signature = crypto
    .createHmac("sha256", signingSecret)
    .update(signatureContent)
    .digest("hex");

  // 返回完整的 iframe URL（包含簽名和過期時間）
  return `https://customer-${customerCode}.cloudflarestream.com/${videoId}/iframe?token=${signature}&expires=${expireTimestamp}&preload=auto`;
}

/**
 * 透過 Cloudflare API 產生 Stream 簽名 Token（供 @cloudflare/stream-react 使用）
 * @param videoId - Cloudflare Stream 影片 ID
 * @param expiresIn - 有效期（秒），預設 2 小時
 * @returns 包含 videoId、token 和 customerCode 的物件，若失敗則返回 null
 */
export async function generateSignedStreamToken(
  videoId: string,
  expiresIn: number = 7200
): Promise<{ videoId: string; token: string; customerCode: string } | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const customerCode = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE;

  if (!accountId || !apiToken || !customerCode) {
    console.error(
      "缺少 Cloudflare Stream 簽名設定 (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CLOUDFLARE_STREAM_CUSTOMER_CODE)"
    );
    return null;
  }

  try {
    // 計算過期時間（ISO 8601 格式）
    const exp = Math.floor(Date.now() / 1000) + expiresIn;

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          exp,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Cloudflare Stream Token API 錯誤:",
        response.status,
        errorText
      );
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.result?.token) {
      console.error("Cloudflare Stream Token API 回傳錯誤:", data.errors);
      return null;
    }

    return {
      videoId,
      token: data.result.token,
      customerCode,
    };
  } catch (error) {
    console.error("呼叫 Cloudflare Stream Token API 失敗:", error);
    return null;
  }
}

// ==================== Cloudflare R2 API ====================

/**
 * 建立 R2 S3 客戶端
 */
function getR2Client(): S3Client | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * R2 上傳結果
 */
export interface R2UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * 上傳檔案到 R2
 */
export async function uploadToR2(
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<R2UploadResult> {
  const client = getR2Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

  if (!client || !bucket) {
    return {
      success: false,
      error: "缺少 R2 設定",
    };
  }

  // 產生唯一的檔案路徑
  const timestamp = Date.now();
  const key = `media/${timestamp}-${filename}`;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
      })
    );

    // 建立公開 URL
    const url = publicUrl
      ? `${publicUrl}/${key}`
      : `https://${bucket}.r2.dev/${key}`;

    return {
      success: true,
      url,
      key,
    };
  } catch (error) {
    console.error("上傳到 R2 失敗:", error);
    return {
      success: false,
      error: "上傳檔案時發生錯誤",
    };
  }
}

/**
 * 從 R2 刪除檔案
 */
export async function deleteFromR2(
  key: string
): Promise<{ success: boolean; error?: string }> {
  const client = getR2Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!client || !bucket) {
    return {
      success: false,
      error: "缺少 R2 設定",
    };
  }

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    return { success: true };
  } catch (error) {
    console.error("從 R2 刪除失敗:", error);
    return {
      success: false,
      error: "刪除檔案時發生錯誤",
    };
  }
}

/**
 * 取得 R2 預簽名上傳 URL
 */
export async function getR2PresignedUploadUrl(
  filename: string,
  mimeType: string,
  expiresIn: number = 3600
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  const client = getR2Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!client || !bucket) {
    return {
      success: false,
      error: "缺少 R2 設定",
    };
  }

  // 產生唯一的檔案路徑
  const timestamp = Date.now();
  const key = `media/${timestamp}-${filename}`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(client, command, { expiresIn });

    return {
      success: true,
      url,
      key,
    };
  } catch (error) {
    console.error("取得預簽名 URL 失敗:", error);
    return {
      success: false,
      error: "取得上傳 URL 時發生錯誤",
    };
  }
}

/**
 * 取得 R2 預簽名下載 URL
 */
export async function getR2PresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  const client = getR2Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!client || !bucket) {
    return {
      success: false,
      error: "缺少 R2 設定",
    };
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn });

    return {
      success: true,
      url,
    };
  } catch (error) {
    console.error("取得預簽名下載 URL 失敗:", error);
    return {
      success: false,
      error: "取得下載 URL 時發生錯誤",
    };
  }
}

/**
 * 從 URL 取得 R2 key
 * 支援多種 URL 格式：
 * - 自訂公開 URL (CLOUDFLARE_R2_PUBLIC_URL)
 * - r2.dev 預設 URL
 * - 自訂域名（嘗試解析 media/ 路徑）
 */
export function getR2KeyFromUrl(url: string): string | null {
  // 1. 優先使用環境變數中的公開 URL
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  if (publicUrl && url.startsWith(publicUrl)) {
    return url.replace(`${publicUrl}/`, "");
  }

  // 2. 嘗試解析 r2.dev URL
  const r2DevMatch = url.match(/\.r2\.dev\/(.+)$/);
  if (r2DevMatch) {
    return r2DevMatch[1];
  }

  // 3. 嘗試解析自訂域名的 media/ 路徑
  // 例如：https://cdn.example.com/media/123456-filename.jpg
  const mediaPathMatch = url.match(/\/(media\/.+)$/);
  if (mediaPathMatch) {
    return mediaPathMatch[1];
  }

  // 4. 嘗試從 URL 路徑中提取（移除協議和域名）
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // 移除開頭的斜線
    if (pathname.startsWith("/")) {
      return pathname.slice(1);
    }
    return pathname || null;
  } catch {
    // 無效的 URL
    return null;
  }
}
