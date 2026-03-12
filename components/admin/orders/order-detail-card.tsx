// components/admin/orders/order-detail-card.tsx
// 訂單詳情卡片元件
// 顯示訂單完整資訊，包含時間軸

"use client";

import Link from "next/link";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import type { OrderWithDetails } from "@/lib/actions/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  BookOpen,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Ban,
  ExternalLink,
} from "lucide-react";
import type { OrderStatus, PaymentMethod } from "@prisma/client";

interface OrderDetailCardProps {
  order: OrderWithDetails;
}

// 訂單狀態 Badge 樣式 - VibeFlow 風格
const statusStyles: Record<OrderStatus, { label: string; className: string }> =
  {
    PENDING: {
      label: "待付款",
      className:
        "bg-[#FEF3C7] text-[#92400E] hover:bg-[#FEF3C7] border border-[#FCD34D]",
    },
    PAID: {
      label: "已付款",
      className:
        "bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5] border border-[#6EE7B7]",
    },
    FAILED: {
      label: "付款失敗",
      className:
        "bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FEE2E2] border border-[#FCA5A5]",
    },
    REFUNDED: {
      label: "已退款",
      className:
        "bg-[#EDE9FE] text-[#5B21B6] hover:bg-[#EDE9FE] border border-[#C4B5FD]",
    },
    CANCELLED: {
      label: "已取消",
      className:
        "bg-[#F5F5F5] text-[#525252] hover:bg-[#F5F5F5] border border-[#E5E5E5]",
    },
  };

// 付款方式標籤
const paymentMethodLabels: Record<PaymentMethod, string> = {
  CREDIT_CARD: "信用卡",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  ATM: "ATM 轉帳",
  CVS: "超商代碼",
};

// 時間軸事件
interface TimelineEvent {
  icon: React.ReactNode;
  title: string;
  time: Date | null;
  description?: string;
  status: "completed" | "current" | "pending" | "error";
}

// 格式化金額
function formatAmount(amount: number): string {
  return `NT$ ${amount.toLocaleString()}`;
}

export function OrderDetailCard({ order }: OrderDetailCardProps) {
  const status = statusStyles[order.status];

  // 建立時間軸事件
  const getTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [
      {
        icon: <Clock className="h-4 w-4" />,
        title: "訂單建立",
        time: order.createdAt,
        status: "completed",
      },
    ];

    // 根據狀態添加事件
    if (order.status === "PAID") {
      events.push({
        icon: <CheckCircle className="h-4 w-4" />,
        title: "付款成功",
        time: order.paidAt,
        description: order.paymentMethod
          ? `使用 ${paymentMethodLabels[order.paymentMethod]} 付款`
          : undefined,
        status: "completed",
      });
    } else if (order.status === "FAILED") {
      events.push({
        icon: <XCircle className="h-4 w-4" />,
        title: "付款失敗",
        time: order.updatedAt,
        status: "error",
      });
    } else if (order.status === "REFUNDED") {
      events.push({
        icon: <CheckCircle className="h-4 w-4" />,
        title: "付款成功",
        time: order.paidAt,
        status: "completed",
      });
      events.push({
        icon: <RotateCcw className="h-4 w-4" />,
        title: "已退款",
        time: order.refundedAt,
        description: order.refundReason || undefined,
        status: "completed",
      });
    } else if (order.status === "CANCELLED") {
      events.push({
        icon: <Ban className="h-4 w-4" />,
        title: "訂單取消",
        time: order.updatedAt,
        status: "error",
      });
    } else if (order.status === "PENDING") {
      events.push({
        icon: <CreditCard className="h-4 w-4" />,
        title: "等待付款",
        time: null,
        status: "current",
      });
    }

    return events;
  };

  const timelineEvents = getTimelineEvents();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* 左側：訂單資訊 */}
      <div className="lg:col-span-2 space-y-6">
        {/* 基本資訊 */}
        <Card className="bg-white border-[#E5E5E5] rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#0A0A0A]">訂單資訊</CardTitle>
              <Badge className={status.className}>{status.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 訂單編號 */}
            <div className="flex justify-between items-center py-2">
              <span className="text-[#525252]">訂單編號</span>
              <span className="font-mono text-[#0A0A0A]">{order.orderNo}</span>
            </div>
            <Separator className="bg-[#E5E5E5]" />

            {/* 交易 Session ID */}
            {order.stripeSessionId && (
              <>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[#525252]">交易 Session ID</span>
                  <span className="font-mono text-[#0A0A0A] text-xs">
                    {order.stripeSessionId}
                  </span>
                </div>
                <Separator className="bg-[#E5E5E5]" />
              </>
            )}

            {/* 交易編號 */}
            {order.stripePaymentIntentId && (
              <>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[#525252]">交易編號</span>
                  <span className="font-mono text-[#0A0A0A] text-xs">
                    {order.stripePaymentIntentId}
                  </span>
                </div>
                <Separator className="bg-[#E5E5E5]" />
              </>
            )}

            {/* 金額 */}
            <div className="flex justify-between items-center py-2">
              <span className="text-[#525252]">原價</span>
              <span className="text-[#525252]">
                {formatAmount(order.originalAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[#525252]">實付金額</span>
              <span className="text-xl font-bold text-[#F5A524]">
                {formatAmount(order.amount)}
              </span>
            </div>
            {order.amount !== order.originalAmount && (
              <div className="flex justify-between items-center py-2">
                <span className="text-[#525252]">折扣</span>
                <span className="text-[#DC2626]">
                  -{formatAmount(order.originalAmount - order.amount)}
                </span>
              </div>
            )}
            <Separator className="bg-[#E5E5E5]" />

            {/* 付款方式 */}
            <div className="flex justify-between items-center py-2">
              <span className="text-[#525252]">付款方式</span>
              <span className="text-[#0A0A0A]">
                {order.paymentMethod
                  ? paymentMethodLabels[order.paymentMethod]
                  : "-"}
              </span>
            </div>

            {/* 退款原因 */}
            {order.refundReason && (
              <>
                <Separator className="bg-[#E5E5E5]" />
                <div className="py-2">
                  <span className="text-[#525252] block mb-2">退款原因</span>
                  <p className="text-[#0A0A0A] text-sm bg-[#FAFAFA] p-3 rounded-lg border border-[#E5E5E5]">
                    {order.refundReason}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 學員資訊 */}
        <Card className="bg-white border-[#E5E5E5] rounded-xl">
          <CardHeader>
            <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
              <User className="h-5 w-5" />
              學員資訊
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.user ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#0A0A0A] font-medium">
                    {order.user.name || "未設定姓名"}
                  </p>
                  <p className="text-[#525252] text-sm">{order.user.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
                >
                  <Link href={`/admin/users/${order.user.id}`}>
                    查看學員
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-[#A3A3A3]">用戶已刪除</p>
            )}
          </CardContent>
        </Card>

        {/* 課程資訊 */}
        <Card className="bg-white border-[#E5E5E5] rounded-xl">
          <CardHeader>
            <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              課程資訊
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.course ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {order.course.coverImage && (
                    <img
                      src={order.course.coverImage}
                      alt={order.course.title}
                      className="w-20 h-12 object-cover rounded-lg"
                    />
                  )}
                  <p className="text-[#0A0A0A] font-medium">
                    {order.course.title}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
                >
                  <Link href={`/admin/courses/${order.course.id}`}>
                    查看課程
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-[#A3A3A3]">課程已刪除</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 右側：時間軸 */}
      <div>
        <Card className="bg-white border-[#E5E5E5] rounded-xl">
          <CardHeader>
            <CardTitle className="text-[#0A0A0A]">訂單時間軸</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {timelineEvents.map((event, index) => {
                const isLast = index === timelineEvents.length - 1;

                // 狀態顏色 - VibeFlow 風格
                const statusColors = {
                  completed:
                    "bg-[#D1FAE5] text-[#065F46] border border-[#6EE7B7]",
                  current:
                    "bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]",
                  pending:
                    "bg-[#F5F5F5] text-[#525252] border border-[#E5E5E5]",
                  error: "bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]",
                };

                return (
                  <div key={index} className="flex gap-4 pb-6 last:pb-0">
                    {/* 圖示 */}
                    <div className="relative">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${statusColors[event.status]}`}
                      >
                        {event.icon}
                      </div>
                      {/* 連接線 */}
                      {!isLast && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-full bg-[#E5E5E5]" />
                      )}
                    </div>

                    {/* 內容 */}
                    <div className="flex-1 pt-1">
                      <p className="text-[#0A0A0A] font-medium">
                        {event.title}
                      </p>
                      {event.time && (
                        <p className="text-[#A3A3A3] text-sm">
                          {format(new Date(event.time), "yyyy/MM/dd HH:mm:ss", {
                            locale: zhTW,
                          })}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-[#525252] text-sm mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
