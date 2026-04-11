// app/api/payment/create/route.ts
// 建立訂單 API（PAYUNi 金流）
// 驗證用戶登入狀態、課程存在性、重複購買檢查、建立訂單並產生付款會話

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrderSchema } from "@/lib/validations/checkout";
import { generateOrderNo } from "@/lib/payment/shared";
import { getActivePaymentGateway } from "@/lib/payment/gateway-factory";
import { getAppUrl } from "@/lib/app-url";
import {
  checkRateLimit,
  getIdentifier,
  getRateLimitHeaders,
  RATE_LIMIT_CONFIGS,
} from "@/lib/rate-limit";
import { calculatePrice } from "@/lib/utils/price";
import { getPostHogClient } from "@/lib/posthog-server";
import { validateCoupon } from "@/lib/actions/coupons";

const GUEST_SOURCE = "checkout_email";

/**
 * 建立訂單 API
 * POST /api/payment/create
 *
 * 安全機制：
 * 1. Rate Limiting - 防止訂單濫發
 * 2. 身分驗證 - 已登入或未登入（未登入需提供 email，name 選填）
 * 3. 重複購買檢查 - 防止重複購買
 * 4. 待付款訂單復用 - 30 分鐘內的待付款訂單可復用
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 讀取登入狀態（未登入可走 guest checkout）
    const session = await auth();
    const loggedInUserId = session?.user?.id || null;

    // 2. 取得金流閘道
    let gateway;
    try {
      gateway = await getActivePaymentGateway();
    } catch {
      return NextResponse.json(
        { error: "金流系統尚未設定，請聯繫管理員" },
        { status: 500 },
      );
    }

    // 3. 解析並驗證請求資料
    const body = await request.json();
    const validationResult = createOrderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "請求資料格式錯誤", details: validationResult.error.issues },
        { status: 400 },
      );
    }

    const { courseId, email, name, couponCode } = validationResult.data;

    // 4. 決定此次購買對應的使用者
    let purchaserUserId = loggedInUserId;
    let purchaserEmail = session?.user?.email || null;
    const identityType: "auth" | "guest_shell" = loggedInUserId
      ? "auth"
      : "guest_shell";

    if (!purchaserUserId) {
      if (!email) {
        return NextResponse.json(
          {
            error: "請填寫 Email",
            code: "GUEST_FIELDS_REQUIRED",
          },
          { status: 400 },
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      const trimmedName = name?.trim() || null;

      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          password: true,
          isGuest: true,
          name: true,
          phone: true,
          accounts: {
            select: {
              provider: true,
            },
          },
        },
      });

      if (existingUser) {
        const providers = existingUser.accounts.map(
          (account) => account.provider,
        );
        const hasOAuthAccount = providers.some(
          (provider) => provider === "google" || provider === "apple",
        );

        if (!existingUser.isGuest && hasOAuthAccount) {
          return NextResponse.json(
            {
              error: "此 Email 已綁定社群登入，請使用 Google 或 Apple 快速登入",
              code: "OAUTH_ACCOUNT_EXISTS",
              providers,
            },
            { status: 409 },
          );
        }

        if (!existingUser.isGuest && !!existingUser.password) {
          return NextResponse.json(
            {
              error: "此 Email 已註冊會員，請先登入後再購買",
              code: "PASSWORD_ACCOUNT_EXISTS",
            },
            { status: 409 },
          );
        }

        purchaserUserId = existingUser.id;
        purchaserEmail = existingUser.email;

        const patchData: { name?: string } = {};
        if (!existingUser.name && trimmedName) {
          patchData.name = trimmedName;
        }
        if (Object.keys(patchData).length > 0) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: patchData,
          });
        }
      } else {
        const guestUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            ...(trimmedName ? { name: trimmedName } : {}),
            isGuest: true,
            guestSource: GUEST_SOURCE,
          },
          select: {
            id: true,
            email: true,
          },
        });
        purchaserUserId = guestUser.id;
        purchaserEmail = guestUser.email;
      }
    }

    if (!purchaserUserId) {
      return NextResponse.json(
        { error: "無法建立購買身份，請稍後再試" },
        { status: 500 },
      );
    }

    // 5. Rate Limiting 檢查
    const identifier = loggedInUserId
      ? getIdentifier(request, loggedInUserId)
      : `guest:${purchaserEmail || getIdentifier(request)}`;
    const rateLimitResult = checkRateLimit(
      `payment:${identifier}`,
      RATE_LIMIT_CONFIGS.payment,
    );

    if (!rateLimitResult.success) {
      const headers = getRateLimitHeaders(rateLimitResult);
      return NextResponse.json(
        { error: "請求過於頻繁，請稍後再試" },
        { status: 429, headers },
      );
    }

    // 6. 查詢課程
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        status: {
          in: ["PUBLISHED", "UNLISTED"],
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "課程不存在或尚未發佈" },
        { status: 404 },
      );
    }

    // 7. 檢查是否已購買過
    const existingPurchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: {
          userId: purchaserUserId,
          courseId,
        },
      },
    });

    if (existingPurchase && !existingPurchase.revokedAt) {
      return NextResponse.json(
        { error: "您已經購買過此課程" },
        { status: 400 },
      );
    }

    // 8. 計算當前價格（使用統一的價格計算邏輯）
    const { finalPrice: priceBeforeCoupon, isOnSale } = calculatePrice({
      originalPrice: course.price,
      salePrice: course.salePrice,
      saleEndAt: course.saleEndAt,
      saleCycleEnabled: course.saleCycleEnabled,
      saleCycleDays: course.saleCycleDays,
    });

    // 8.5 優惠券折扣
    let currentAmount = priceBeforeCoupon;
    let couponId: string | null = null;
    let couponDiscount = 0;

    if (couponCode) {
      const couponResult = await validateCoupon(
        couponCode,
        courseId,
        priceBeforeCoupon,
        purchaserUserId,
      );

      if (!couponResult.valid) {
        return NextResponse.json(
          { error: couponResult.error, code: "COUPON_INVALID" },
          { status: 400 },
        );
      }

      couponId = couponResult.couponId!;
      couponDiscount = couponResult.discountAmount!;
      currentAmount = couponResult.finalPrice!;
    }

    // 8.1 零元課程不走付款流程，引導使用免費註冊
    if (currentAmount === 0) {
      return NextResponse.json(
        { error: "此課程目前為免費，請直接加入課程", code: "FREE_COURSE" },
        { status: 400 },
      );
    }

    // 9. 使用事務處理訂單建立/復用，避免競態條件
    const baseUrl = getAppUrl();

    const order = await prisma.$transaction(async (tx) => {
      // 檢查是否有待付款訂單（在事務內查詢以獲得一致性）
      const pendingOrder = await tx.order.findFirst({
        where: {
          userId: purchaserUserId,
          courseId,
          status: "PENDING",
          createdAt: {
            gte: new Date(Date.now() - 30 * 60 * 1000),
          },
        },
      });

      if (pendingOrder) {
        if (
          pendingOrder.amount !== currentAmount ||
          pendingOrder.couponId !== couponId
        ) {
          await tx.order.update({
            where: { id: pendingOrder.id },
            data: { status: "CANCELLED" },
          });
          console.log(
            "[Payment Create] 價格或優惠券變動，取消舊訂單:",
            pendingOrder.orderNo,
          );
        } else {
          console.log("[Payment Create] 復用待付款訂單:", pendingOrder.orderNo);
          return pendingOrder;
        }
      }

      const orderNo = generateOrderNo();

      // 讀取 UTM cookie
      const utmCookie = request.cookies.get("__utm")?.value;
      let utmData: Record<string, string> = {};
      if (utmCookie) {
        try {
          utmData = JSON.parse(utmCookie);
        } catch {
          // 忽略解析錯誤
        }
      }

      return tx.order.create({
        data: {
          orderNo,
          userId: purchaserUserId,
          courseId,
          amount: currentAmount,
          originalAmount: course.price,
          couponId,
          couponDiscount: couponDiscount > 0 ? couponDiscount : null,
          status: "PENDING",
          paymentGateway: gateway.type,
          clientIpAddress:
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            null,
          clientUserAgent: request.headers.get("user-agent") || null,
          utmSource: utmData.utm_source || null,
          utmMedium: utmData.utm_medium || null,
          utmCampaign: utmData.utm_campaign || null,
          utmContent: utmData.utm_content || null,
          utmTerm: utmData.utm_term || null,
        },
      });
    });

    // 10. 建立金流付款會話
    const paymentResult = await gateway.createPaymentSession({
      order: { id: order.id, orderNo: order.orderNo, amount: order.amount },
      course: { title: course.title, subtitle: course.subtitle },
      customerEmail: purchaserEmail,
      baseUrl,
      identityType,
      userId: purchaserUserId,
      courseId,
      isOnSale,
    });

    // 更新訂單的 gateway session ID
    if (paymentResult.gatewaySessionId) {
      await prisma.order.update({
        where: { id: order.id },
        data: { stripeSessionId: paymentResult.gatewaySessionId },
      });
    }

    console.log(
      "[Payment Create] 訂單建立成功:",
      order.orderNo,
      `(${gateway.type})`,
    );

    // PostHog: Track payment created
    const posthog = await getPostHogClient();
    if (posthog) {
      posthog.capture({
        distinctId: purchaserUserId,
        event: "payment_created",
        properties: {
          order_id: order.id,
          order_no: order.orderNo,
          course_id: courseId,
          course_title: course.title,
          course_slug: course.slug,
          amount: order.amount,
          original_amount: order.originalAmount,
          currency: "TWD",
          payment_gateway: gateway.type,
          identity_type: identityType,
        },
      });
      await posthog.flush();
    }

    return NextResponse.json(
      {
        orderId: order.id,
        orderNo: order.orderNo,
        amount: order.amount,
        paymentType: paymentResult.type,
        checkoutUrl: paymentResult.checkoutUrl,
        formData: paymentResult.formData,
        // 回傳 purchaserUserId 讓前端可以 identify 訪客用戶，串接漏斗事件
        userId: purchaserUserId,
      },
      { headers: getRateLimitHeaders(rateLimitResult) },
    );
  } catch (error) {
    console.error("[Payment Create] 錯誤:", error);

    return NextResponse.json(
      { error: "建立訂單失敗，請稍後再試" },
      { status: 500 },
    );
  }
}
