// components/main/player/action-bar.tsx
// 章節切換列元件
// Sticky 定位，包含上下章節切換和選單按鈕

"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdjacentLessons } from "@/lib/actions/lesson";

interface ActionBarProps {
  currentTitle: string;
  chapterTitle: string;
  adjacentLessons: AdjacentLessons;
  courseSlug: string;
}

export function ActionBar({
  currentTitle,
  chapterTitle,
  adjacentLessons,
  courseSlug,
}: ActionBarProps) {
  return (
    <div className="md:sticky md:top-0 px-4 z-30 border-b container mx-auto backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-center px-4 lg:px-8">
        {/* 上下章節切換 */}
        <div className="flex items-center gap-1">
          {adjacentLessons.previous ? (
            <Link
              href={`/courses/${courseSlug}/lessons/${adjacentLessons.previous.id}`}
            >
              <Button
                variant="ghost"
                className="text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]"
                aria-label={`上一個單元：${adjacentLessons.previous.title}`}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              disabled
              className="text-[#D4D4D4]"
              aria-label="沒有上一個單元"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          {/* 中間：章節和單元標題 */}
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-4">
            <span className="truncate text-xs text-[#A3A3A3]">
              {chapterTitle}
            </span>
            <span className="max-w-full truncate text-sm font-semibold text-[#0A0A0A]">
              {currentTitle}
            </span>
          </div>

          {adjacentLessons.next ? (
            <Link
              href={`/courses/${courseSlug}/lessons/${adjacentLessons.next.id}`}
            >
              <Button
                variant="ghost"
                size="icon"
                className="text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]"
                aria-label={`下一個單元：${adjacentLessons.next.title}`}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              disabled
              className="text-[#D4D4D4]"
              aria-label="沒有下一個單元"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
