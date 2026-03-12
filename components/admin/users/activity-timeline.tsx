// components/admin/users/activity-timeline.tsx
// 學員活動時間軸
// 聚合購買、學習、管理操作等事件

import type { TimelineEvent } from "@/lib/actions/users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  ShoppingCart,
  BookOpen,
  Shield,
  StickyNote,
  Pencil,
  UserPlus,
  BookX,
  CheckCircle,
} from "lucide-react";

interface ActivityTimelineProps {
  events: TimelineEvent[];
}

const eventConfig: Record<
  TimelineEvent["type"],
  { icon: typeof Clock; color: string; bgColor: string }
> = {
  account_created: {
    icon: UserPlus,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  purchase: {
    icon: ShoppingCart,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  grant_access: {
    icon: BookOpen,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  revoke_access: {
    icon: BookX,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  role_change: {
    icon: Shield,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  user_update: {
    icon: Pencil,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  notes_update: {
    icon: StickyNote,
    color: "text-slate-600",
    bgColor: "bg-slate-50",
  },
  lesson_complete: {
    icon: CheckCircle,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
  },
};

function formatDate(date: Date) {
  return new Date(date).toLocaleString("zh-TW", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <Card className="border-[#E5E5E5] rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-[#0A0A0A] flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#C41E3A]" />
          活動時間軸
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* 時間軸線 */}
          <div className="absolute left-3.5 top-0 bottom-0 w-px bg-[#E5E5E5]" />

          <div className="space-y-4">
            {events.map((event) => {
              const config = eventConfig[event.type];
              const Icon = config.icon;

              return (
                <div key={event.id} className="relative flex gap-3 pl-0">
                  {/* 圖標 */}
                  <div
                    className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full ${config.bgColor} flex-shrink-0`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                  </div>

                  {/* 內容 */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[#0A0A0A]">
                        {event.title}
                      </span>
                      <span className="text-xs text-[#A3A3A3]">
                        {formatDate(event.createdAt)}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-xs text-[#525252] mt-0.5 line-clamp-1">
                        {event.description}
                      </p>
                    )}
                    {event.actor && (
                      <p className="text-xs text-[#A3A3A3] mt-0.5">
                        操作者：{event.actor}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
