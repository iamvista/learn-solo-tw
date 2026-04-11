"use client";

// app/(main)/checkout/checkout-client.tsx
// 結帳頁面客戶端元件
// 處理付款表單提交和跳轉

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, ShieldCheck, Tag, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import posthog from "posthog-js";
import { loginWithGoogle, loginWithApple } from "@/lib/actions/auth";

interface CheckoutClientProps {
  course: {
    id: string;
    title: string;
    subtitle: string | null;
    slug: string;
    coverImage: string | null;
    originalPrice: number;
    finalPrice: number;
    isOnSale: boolean;
    saleEndAt: string | null;
  };
  user: {
    name: string;
    email: string;
    isLoggedIn: boolean;
  };
  googleLoginEnabled?: boolean;
  appleLoginEnabled?: boolean;
}

/**
 * 格式化價格
 */
function formatPrice(price: number): string {
  return `NT$ ${price.toLocaleString("zh-TW")}`;
}

import { motion } from "framer-motion";

export function CheckoutClient({
  course,
  user,
  googleLoginEnabled = true,
  appleLoginEnabled = true,
}: CheckoutClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState(user.email || "");
  const [guestName, setGuestName] = useState(user.name || "");
  const [guestOptionTracked, setGuestOptionTracked] = useState(false);

  // 優惠券狀態
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    name: string;
    discountAmount: number;
    finalPrice: number;
  } | null>(null);

  // PostHog: 結帳頁瀏覽事件（頁面載入時觸發，與 checkout_initiated 按鈕點擊區分）
  useEffect(() => {
    posthog.capture("checkout_page_viewed", {
      course_id: course.id,
      course_slug: course.slug,
      course_title: course.title,
      original_price: course.originalPrice,
      final_price: course.finalPrice,
      is_on_sale: course.isOnSale,
      currency: "TWD",
    });
  }, [
    course.id,
    course.slug,
    course.title,
    course.originalPrice,
    course.finalPrice,
    course.isOnSale,
  ]);

  // PostHog: 結帳放棄追蹤（用戶離開結帳頁時觸發）
  useEffect(() => {
    const handleBeforeUnload = () => {
      posthog.capture("checkout_abandoned", {
        course_id: course.id,
        course_slug: course.slug,
        course_title: course.title,
        final_price: course.finalPrice,
        abandon_method: "page_leave",
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [course.id, course.slug, course.title, course.finalPrice]);

  /**
   * 驗證優惠碼
   */
  async function handleApplyCoupon() {
    const code = couponCode.trim();
    if (!code) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      const response = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, courseId: course.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        setCouponError(result.error || "優惠碼無效");
        return;
      }

      setAppliedCoupon({
        code: result.code,
        name: result.name,
        discountAmount: result.discountAmount,
        finalPrice: result.finalPrice,
      });

      posthog.capture("coupon_applied", {
        course_id: course.id,
        coupon_code: result.code,
        discount_amount: result.discountAmount,
        final_price: result.finalPrice,
      });
    } catch {
      setCouponError("驗證失敗，請稍後再試");
    } finally {
      setCouponLoading(false);
    }
  }

  /**
   * 移除已套用的優惠碼
   */
  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  }

  // 實際要付的金額（優惠券折抵後）
  const displayPrice = appliedCoupon ? appliedCoupon.finalPrice : course.finalPrice;

  /**
   * 處理付款
   */
  async function handlePayment() {
    try {
      setIsLoading(true);
      setError(null);

      if (!user.isLoggedIn) {
        if (!guestEmail.trim()) {
          setError("請填寫 Email");
          setIsLoading(false);
          return;
        }
      }

      // PostHog: Track checkout initiated
      posthog.capture("checkout_initiated", {
        course_id: course.id,
        course_slug: course.slug,
        course_title: course.title,
        original_price: course.originalPrice,
        final_price: course.finalPrice,
        is_on_sale: course.isOnSale,
        currency: "TWD",
        identity_type: user.isLoggedIn ? "auth" : "guest_form",
      });

      // 呼叫建立訂單 API
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: course.id,
          ...(user.isLoggedIn
            ? {}
            : {
                email: guestEmail.trim().toLowerCase(),
                ...(guestName.trim() ? { name: guestName.trim() } : {}),
              }),
          ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result?.code === "OAUTH_ACCOUNT_EXISTS") {
          throw new Error(
            "此 Email 已綁定社群登入，請改用上方 Google / Apple 快速登入",
          );
        }
        if (result?.code === "PASSWORD_ACCOUNT_EXISTS") {
          throw new Error("此 Email 已註冊會員，請先登入後再購買");
        }
        throw new Error(result.error || "建立訂單失敗");
      }

      // 訪客用戶：將 PostHog 匿名 ID 與新建的 userId 關聯
      // 確保前臺的 $pageview、cta_clicked、checkout_initiated 等事件
      // 可以與 server-side 的 payment_succeeded 事件在漏斗中正確串接
      if (!user.isLoggedIn && result.userId) {
        posthog.identify(result.userId, {
          email: guestEmail.trim().toLowerCase(),
          ...(guestName.trim() ? { name: guestName.trim() } : {}),
        });
      }

      // 依據金流類型跳轉
      if (result.paymentType === "form_post" && result.formData) {
        // PAYUNi：跳轉到靜態頁面 POST 表單
        const redirectUrl = new URL(
          "/payuni-redirect.html",
          window.location.origin,
        );
        redirectUrl.searchParams.set("apiUrl", result.formData.apiUrl);
        redirectUrl.searchParams.set("MerID", result.formData.MerID);
        redirectUrl.searchParams.set("Version", result.formData.Version);
        redirectUrl.searchParams.set(
          "EncryptInfo",
          encodeURIComponent(result.formData.EncryptInfo),
        );
        redirectUrl.searchParams.set(
          "HashInfo",
          encodeURIComponent(result.formData.HashInfo),
        );
        window.location.href = redirectUrl.toString();
      } else {
        // 其他金流：直接跳轉到付款頁面
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "付款失敗，請稍後再試");
      setIsLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* 返回連結 */}
      <Link
        href={`/courses/${course.slug}`}
        className="inline-flex items-center gap-2 text-[#525252] hover:text-[#0A0A0A] transition-colors text-sm font-medium"
        onClick={() => {
          posthog.capture("checkout_abandoned", {
            course_id: course.id,
            course_slug: course.slug,
            course_title: course.title,
            final_price: course.finalPrice,
            abandon_method: "back_button",
          });
        }}
      >
        <ArrowLeft className="h-4 w-4" />
        返回課程頁面
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:gap-8">
        {/* 左欄：會員資訊填寫 */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[#0A0A0A]">會員資訊填寫</h2>

          {!user.isLoggedIn && (
            <div className="mt-6">
              {(googleLoginEnabled || appleLoginEnabled) && (
                <>
                  <p className="mb-3 text-sm font-medium text-[#525252]">
                    會員購買
                  </p>
                  <div
                    className={`grid gap-3 ${googleLoginEnabled && appleLoginEnabled ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}
                  >
                    {googleLoginEnabled && (
                      <form action={loginWithGoogle}>
                        <input
                          type="hidden"
                          name="callbackUrl"
                          value={`/checkout?courseId=${course.id}`}
                        />
                        <Button
                          type="submit"
                          variant="outline"
                          className="w-full rounded-xl border-[#E5E5E5] py-6"
                          onClick={() => {
                            posthog.capture(
                              "checkout_identity_option_clicked",
                              {
                                method: "google",
                                course_id: course.id,
                              },
                            );
                          }}
                        >
                          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                          </svg>
                          Google 快速登入
                        </Button>
                      </form>
                    )}

                    {appleLoginEnabled && (
                      <form action={loginWithApple}>
                        <input
                          type="hidden"
                          name="callbackUrl"
                          value={`/checkout?courseId=${course.id}`}
                        />
                        <Button
                          type="submit"
                          variant="outline"
                          className="w-full rounded-xl border-[#E5E5E5] py-6"
                          onClick={() => {
                            posthog.capture(
                              "checkout_identity_option_clicked",
                              {
                                method: "apple",
                                course_id: course.id,
                              },
                            );
                          }}
                        >
                          <svg
                            className="mr-2 h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                          </svg>
                          Apple 快速登入
                        </Button>
                      </form>
                    )}
                  </div>
                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-[#E5E5E5]" />
                    <span className="text-xs text-[#A3A3A3]">
                      或使用非會員直接購買
                    </span>
                    <div className="h-px flex-1 bg-[#E5E5E5]" />
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0A0A0A]">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={guestEmail}
                onChange={(event) => setGuestEmail(event.target.value)}
                onFocus={() => {
                  if (guestOptionTracked || user.isLoggedIn) return;
                  posthog.capture("checkout_identity_option_clicked", {
                    method: "guest_form",
                    course_id: course.id,
                  });
                  setGuestOptionTracked(true);
                }}
                placeholder="your-email@example.com"
                disabled={user.isLoggedIn}
                className="h-12 rounded-xl border-[#E5E5E5]"
              />
              {!user.isLoggedIn && (
                <p className="text-xs text-[#A3A3A3]">
                  此信箱將作為課程啟用帳號
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0A0A0A]">姓名</label>
              <Input
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="請填入姓名（選填）"
                disabled={user.isLoggedIn}
                className="h-12 rounded-xl border-[#E5E5E5]"
              />
            </div>
          </div>

          {user.isLoggedIn && (
            <p className="mt-4 text-sm text-[#525252]">
              已登入會員：{user.email}
            </p>
          )}

          {/* 優惠碼 */}
          <div className="mt-6 space-y-2">
            <label className="text-sm font-medium text-[#0A0A0A]">
              優惠碼
            </label>
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    {appliedCoupon.code}
                  </span>
                  <span className="text-sm text-green-600">
                    已折抵 {formatPrice(appliedCoupon.discountAmount)}
                  </span>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="rounded-full p-1 text-green-600 hover:bg-green-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyCoupon();
                    }
                  }}
                  placeholder="輸入優惠碼"
                  className="h-12 flex-1 rounded-xl border-[#E5E5E5]"
                />
                <Button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  variant="outline"
                  className="h-12 rounded-xl border-[#E5E5E5] px-5"
                >
                  {couponLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Tag className="mr-1.5 h-3.5 w-3.5" />
                      套用
                    </>
                  )}
                </Button>
              </div>
            )}
            {couponError && (
              <p className="text-xs text-red-500">{couponError}</p>
            )}
          </div>

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

          <Button
            onClick={handlePayment}
            disabled={isLoading}
            className="mt-6 w-full rounded-xl bg-[#C41E3A] py-7 text-base font-bold text-white hover:bg-[#A01830]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                金流引導中...
              </>
            ) : (
              "確認送出"
            )}
          </Button>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#A3A3A3]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>
              下一步將連至第三方金流平臺，您所有的交易資訊皆獲得安全保護。
            </span>
          </div>
        </div>

        {/* 右欄：訂單摘要 */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 sm:p-8 lg:sticky lg:top-24 lg:h-fit">
          <h2 className="text-xl font-bold text-[#0A0A0A]">訂單摘要</h2>

          <div className="mt-5 space-y-3">
            <p className="text-base font-medium text-[#0A0A0A]">
              {course.title}
            </p>
            {course.subtitle && (
              <p className="text-sm text-[#525252]">{course.subtitle}</p>
            )}
          </div>

          <div className="my-5 h-px bg-[#E5E5E5]" />

          <div className="space-y-3">
            {course.isOnSale && (
              <div className="flex justify-between text-sm text-[#525252]">
                <span>原價</span>
                <span className="line-through">
                  {formatPrice(course.originalPrice)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm text-[#525252]">
              <span>小計</span>
              <span>{formatPrice(course.finalPrice)}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-sm text-green-600">
                <span>優惠券折抵（{appliedCoupon.code}）</span>
                <span>-{formatPrice(appliedCoupon.discountAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-[#E5E5E5] pt-3">
              <span className="font-semibold text-[#0A0A0A]">總計</span>
              <span className="text-2xl font-bold text-[#0A0A0A]">
                {formatPrice(displayPrice)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
