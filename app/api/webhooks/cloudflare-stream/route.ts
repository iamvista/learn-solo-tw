// app/api/webhooks/cloudflare-stream/route.ts
// Cloudflare Stream Webhook 處理器
// 當影片處理完成時，更新 Media 記錄的 duration 和 status

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Cloudflare Stream Webhook 事件類型
 * 參考: https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/
 */
interface StreamWebhookPayload {
  uid: string;
  readyToStream: boolean;
  status: {
    state:
      | "queued"
      | "inprogress"
      | "pendingupload"
      | "downloading"
      | "ready"
      | "error";
    pctComplete?: string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  meta?: {
    name?: string;
  };
  created?: string;
  modified?: string;
  duration?: number;
  size?: number;
  input?: {
    width?: number;
    height?: number;
  };
  playback?: {
    hls?: string;
    dash?: string;
  };
  thumbnail?: string;
  preview?: string;
}

/**
 * 驗證 Cloudflare Webhook 簽名
 * 注意：需要在 Cloudflare Dashboard 設定 webhook signing secret
 */
async function verifyWebhookSignature(
  request: NextRequest,
  body: string,
): Promise<boolean> {
  const webhookSecret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;

  // 如果沒有設定 webhook secret，僅在開發環境跳過驗證
  if (!webhookSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("錯誤：生產環境必須設定 CLOUDFLARE_STREAM_WEBHOOK_SECRET");
      return false;
    }
    console.warn(
      "警告：未設定 CLOUDFLARE_STREAM_WEBHOOK_SECRET，跳過簽名驗證（開發環境）",
    );
    return true;
  }

  const signature = request.headers.get("webhook-signature");
  if (!signature) {
    console.error("缺少 webhook-signature header");
    return false;
  }

  // Cloudflare 使用 HMAC-SHA256 簽名
  // 格式: time=<timestamp>,sig1=<signature>
  const parts = signature.split(",");
  const timestampPart = parts.find((p) => p.startsWith("time="));
  const sigPart = parts.find((p) => p.startsWith("sig1="));

  if (!timestampPart || !sigPart) {
    console.error("webhook-signature 格式錯誤");
    return false;
  }

  const timestamp = timestampPart.replace("time=", "");
  const sig = sigPart.replace("sig1=", "");

  // 驗證時間戳（防止重放攻擊，允許 5 分鐘誤差）
  const timestampNum = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampNum) > 300) {
    console.error("webhook 時間戳已過期");
    return false;
  }

  // 計算預期簽名
  const signedPayload = `${timestamp}.${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload),
  );
  const expectedSig = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return sig === expectedSig;
}

/**
 * POST /api/webhooks/cloudflare-stream
 * 處理 Cloudflare Stream Webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // 驗證簽名
    const isValid = await verifyWebhookSignature(request, body);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "無效的簽名" },
        { status: 401 },
      );
    }

    // 解析 payload
    const payload: StreamWebhookPayload = JSON.parse(body);
    const { uid, status, duration, readyToStream } = payload;

    console.log(
      `[Cloudflare Stream Webhook] 收到事件: uid=${uid}, state=${status.state}, duration=${duration}`,
    );

    // 根據 cfStreamId 找到對應的 Media 記錄
    const media = await prisma.media.findFirst({
      where: { cfStreamId: uid },
    });

    if (!media) {
      console.log(
        `[Cloudflare Stream Webhook] 找不到對應的 Media 記錄: ${uid}`,
      );
      // 返回 200 以避免 Cloudflare 重試
      return NextResponse.json({
        success: true,
        message: "找不到對應的媒體記錄",
      });
    }

    // 更新 Media 記錄
    const updateData: {
      cfStatus: string;
      duration?: number;
    } = {
      cfStatus: status.state,
    };

    // 只有當 duration 有值時才更新
    if (typeof duration === "number" && duration > 0) {
      updateData.duration = Math.round(duration);
    }

    await prisma.media.update({
      where: { id: media.id },
      data: updateData,
    });

    console.log(
      `[Cloudflare Stream Webhook] 已更新 Media 記錄: id=${media.id}, status=${status.state}, duration=${duration}`,
    );

    // 重新驗證快取
    revalidatePath("/admin/media");
    revalidatePath("/admin/media/videos");

    return NextResponse.json({
      success: true,
      message: "已更新媒體記錄",
      mediaId: media.id,
      status: status.state,
      duration: updateData.duration,
    });
  } catch (error) {
    console.error("[Cloudflare Stream Webhook] 處理錯誤:", error);
    return NextResponse.json(
      { success: false, error: "處理 webhook 時發生錯誤" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/webhooks/cloudflare-stream
 * 用於測試 webhook endpoint 是否可用
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Cloudflare Stream Webhook endpoint is active",
  });
}
