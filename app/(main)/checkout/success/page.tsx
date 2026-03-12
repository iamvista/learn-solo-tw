// app/(main)/checkout/success/page.tsx
// 付款成功頁面

import { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { MetaPixelPurchase } from "@/components/common/meta-pixel-events";

export const metadata: Metadata = {
  title: "付款成功 | 課程平臺",
  description: "恭喜您完成購買！",
};

interface SuccessPageProps {
  searchParams: Promise<{
    orderNo?: string;
  }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { orderNo } = await searchParams;

  // 查詢訂單資訊
  let order = null;
  let course = null;
  let guestEmail: string | null = null;
  let isGuestOrder = false;

  if (orderNo) {
    order = await prisma.order.findUnique({
      where: { orderNo },
      select: {
        id: true,
        orderNo: true,
        userId: true,
        amount: true,
        status: true,
        courseId: true,
        paidAt: true,
      },
    });

    if (order) {
      const orderUser = await prisma.user.findUnique({
        where: { id: order.userId },
        select: {
          id: true,
          email: true,
          isGuest: true,
          guestActivatedAt: true,
        },
      });
      isGuestOrder = !!orderUser?.isGuest;
      guestEmail = orderUser?.email ?? null;

      course = await prisma.course.findUnique({
        where: { id: order.courseId },
        select: {
          id: true,
          title: true,
          slug: true,
          chapters: {
            orderBy: { order: "asc" },
            take: 1,
            select: {
              lessons: {
                orderBy: { order: "asc" },
                take: 1,
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      // payment_succeeded 事件已移至 PAYUNi webhook 中觸發，確保 guest 和登入用戶都能追蹤
    }
  }

  return (
    <div className="min-h-screen bg-white py-12 sm:py-24">
      {/* Meta Pixel Purchase 轉換事件 */}
      {order && order.status === "PAID" && (
        <MetaPixelPurchase
          value={order.amount}
          contentName={course?.title}
          contentId={order.courseId}
          eventId={order.orderNo}
        />
      )}

      <div className="mx-auto px-4 max-w-xl">
        <div>
          <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8 sm:p-12 text-center shadow-none">
            {/* 成功圖示 */}
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-8">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>

            {/* 標題 */}
            <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A] mb-3">
              付款成功！
            </h1>
            <p className="text-[#525252] mb-10">
              感謝您的購買，課程內容已為您即刻解鎖
            </p>

            {/* 訂單資訊 */}
            {order && (
              <div className="bg-[#FAFAFA] rounded-2xl p-6 mb-10 text-left space-y-4 border border-[#F5F5F5]">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#A3A3A3]">訂單編號</span>
                  <span className="text-[#0A0A0A] font-mono text-xs font-medium">
                    {order.orderNo}
                  </span>
                </div>
                {course && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#A3A3A3]">商品明細</span>
                    <span className="text-[#0A0A0A] font-medium text-sm">
                      {course.title}
                    </span>
                  </div>
                )}
                <div className="h-px bg-[#E5E5E5] my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#A3A3A3]">實付金額</span>
                  <span className="text-[#C41E3A] font-bold text-lg">
                    NT$ {order.amount.toLocaleString("zh-TW")}
                  </span>
                </div>
              </div>
            )}

            {/* 操作按鈕 */}
            <div className="space-y-4">
              {course && !isGuestOrder ? (
                <Button
                  asChild
                  className="w-full rounded-full bg-[#C41E3A] hover:bg-[#A01830] text-white py-8 text-lg font-bold transition-all shadow-lg shadow-[#C41E3A]/20 hover:shadow-xl hover:shadow-[#C41E3A]/30"
                >
                  <Link
                    href={
                      course.chapters[0]?.lessons[0]?.id
                        ? `/courses/${course.slug}/lessons/${course.chapters[0].lessons[0].id}`
                        : `/courses/${course.slug}`
                    }
                  >
                    開始學習
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>
              ) : isGuestOrder ? (
                <Button
                  asChild
                  className="w-full rounded-full bg-[#C41E3A] hover:bg-[#A01830] text-white py-8 text-lg font-bold transition-all shadow-lg shadow-[#C41E3A]/20 hover:shadow-xl hover:shadow-[#C41E3A]/30"
                >
                  <Link href="/login">
                    前往登入頁
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  className="w-full rounded-full bg-[#C41E3A] hover:bg-[#A01830] text-white py-8 text-lg font-bold"
                >
                  <Link href="/">瀏覽所有課程</Link>
                </Button>
              )}

              <Button
                asChild
                variant="ghost"
                className="w-full text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA] py-6 rounded-full"
              >
                <Link href="/">返回首頁</Link>
              </Button>
            </div>

            {/* 提示訊息 */}
            <div className="mt-12 pt-8 border-t border-[#E5E5E5]">
              {isGuestOrder ? (
                <div className="space-y-1 text-sm text-[#737373]">
                  <p>
                    您已完成付款，請至購買信箱收取「啟用帳號」信件後設定密碼。
                  </p>
                  {guestEmail && (
                    <p>
                      啟用信已寄送至：
                      <span className="font-bold">{guestEmail}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#A3A3A3]">
                  購買確認信已同步發送至您的註冊電子信箱
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
