// components/admin/stat-card.tsx
// 後台統計卡片元件
// 用於儀表板顯示各項統計數據
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: React.ReactNode;
  icon: LucideIcon | React.ReactElement;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
}: StatCardProps) {
  // 渲染 icon
  const renderIcon = () => {
    if (typeof icon === "function") {
      // LucideIcon
      const Icon = icon as LucideIcon;
      return <Icon className="h-4 w-4 text-[#A3A3A3]" />;
    }
    // React Element
    return icon;
  };

  return (
    <Card className={cn("bg-white border-[#E5E5E5] rounded-xl", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-[#525252]">
          {title}
        </CardTitle>
        {renderIcon()}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[#0A0A0A]">{value}</div>
        {description && (
          <p className="text-xs text-[#A3A3A3] mt-1">{description}</p>
        )}
        {trend && (
          <p
            className={cn(
              "text-xs mt-1",
              trend.isPositive ? "text-emerald-600" : "text-red-500"
            )}
          >
            {trend.isPositive ? "+" : "-"}
            {Math.abs(trend.value)}% 較上月
          </p>
        )}
      </CardContent>
    </Card>
  );
}
