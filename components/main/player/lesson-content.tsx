/* eslint-disable @typescript-eslint/no-explicit-any */
// components/main/player/lesson-content.tsx
// 單元內容元件

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import type { AdjacentLessons } from "@/lib/actions/lesson";
import { Streamdown } from "streamdown";
import React from "react";

/**
 * 遞迴取得 React Node 中的純文字內容
 */
const getTextContent = (node: any): string => {
  if (!node) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getTextContent).join("");
  if (node.props?.children) return getTextContent(node.props.children);
  return "";
};

/**
 * 統一的 Slugify 邏輯
 */
const slugify = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
};

interface LessonContentProps {
  content: string | null;
  adjacentLessons: AdjacentLessons;
  courseSlug: string;
  onTimestampClick?: (seconds: number) => void;
  onComplete?: () => void;
}

export function LessonContent({
  content,
  adjacentLessons,
  courseSlug,
  onTimestampClick,
  onComplete,
}: LessonContentProps) {
  // 沒有內容時顯示提示
  if (!content) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-[#EBEBF5]/60">此單元尚無文字內容</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
      {/* Markdown 內容 */}
      <article className="prose prose-neutral max-w-none prose-headings:text-[#0A0A0A] prose-h1:text-4xl prose-h1:font-bold prose-h2:text-2xl prose-h2:font-bold prose-h2:border-b prose-h2:border-[#E5E5E5] prose-h2:pb-4 prose-h3:text-xl prose-h3:font-semibold prose-p:text-[#525252] prose-p:leading-relaxed prose-a:text-[#C41E3A] prose-a:no-underline hover:prose-a:underline prose-strong:text-[#0A0A0A] prose-code:text-[#C41E3A] prose-code:bg-[#F5F5F5] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#FAFAFA] prose-pre:border prose-pre:border-[#E5E5E5] prose-blockquote:border-l-[#C41E3A] prose-blockquote:text-[#525252]/80 prose-li:text-[#525252] prose-li:marker:text-[#A3A3A3] prose-hr:border-[#E5E5E5] prose-img:rounded-2xl prose-table:text-[#525252] prose-th:text-[#0A0A0A] prose-th:border-[#E5E5E5] prose-td:border-[#E5E5E5]">
        <Streamdown
          components={{
            // 自訂連結樣式
            a({ href, children }) {
              // 時間戳連結：格式為 #t=秒數 (例如 #t=324)
              if (href?.startsWith("#t=")) {
                const seconds = parseInt(href.replace("#t=", ""), 10);
                if (!isNaN(seconds)) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        onTimestampClick?.(seconds);
                      }}
                      className="inline-flex mx-2 items-center gap-0.5 rounded-full border-2 border-solid border-neutral-700 px-2.5 py-0.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-[#2A2A2A] hover:text-white cursor-pointer"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>{children}</span>
                    </button>
                  );
                }
              }
              // 外部連結
              if (href?.startsWith("http")) {
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                );
              }
              // 內部連結
              return <a href={href}>{children}</a>;
            },
            h1({ children }) {
              const text = getTextContent(children);
              const id = slugify(text);
              return <h1 id={id}>{children}</h1>;
            },
            h2({ children }) {
              const text = getTextContent(children);
              const id = slugify(text);
              return <h2 id={id}>{children}</h2>;
            },
            h3({ children }) {
              const text = getTextContent(children);
              const id = slugify(text);
              return <h3 id={id}>{children}</h3>;
            },
          }}
        >
          {content}
        </Streamdown>
      </article>

      {/* 底部導覽：完成並前往下一章節 */}
      {adjacentLessons.next && (
        <div className="mt-16 border-t border-[#E5E5E5] pt-12">
          <Link
            href={`/courses/${courseSlug}/lessons/${adjacentLessons.next.id}`}
            onClick={() => onComplete?.()}
          >
            <Button
              size="lg"
              className="w-full rounded-full bg-[#C41E3A] py-8 text-lg font-bold text-white shadow-lg shadow-[#C41E3A]/10 transition-all hover:bg-[#A01830] hover:scale-[1.01]"
            >
              <span>完成並前往下一章節：{adjacentLessons.next.title}</span>
              <ChevronRight className="ml-2 h-6 w-6" />
            </Button>
          </Link>
        </div>
      )}

      {/* 課程完成提示 */}
      {!adjacentLessons.next && (
        <div className="mt-16 rounded-2xl border-2 border-[#C41E3A] bg-white p-12 text-center shadow-xl shadow-[#C41E3A]/5">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#FEF3C7]">
            <ChevronRight className="h-10 w-10 rotate-[-90deg] text-[#C41E3A]" />
          </div>
          <h3 className="text-2xl font-bold text-[#0A0A0A]">
            恭喜完成本課程！
          </h3>
          <p className="mt-4 text-lg text-[#525252]">
            你已經完成了所有的單元內容，太棒了！
          </p>
          <Link href={`/courses/${courseSlug}`}>
            <Button className="mt-8 rounded-full border-[#E5E5E5] bg-transparent border px-10 py-6 text-[#0A0A0A] hover:bg-[#FAFAFA]">
              返回課程總覽
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
