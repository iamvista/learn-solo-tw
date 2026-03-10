// components/main/course-card.tsx
// 課程卡片元件
// VibeFlow Design System - 極簡白黑橘風格

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, Layers, ArrowRight, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { calculatePrice, formatPrice } from '@/lib/utils/price'
import type { PublishedCourse } from '@/lib/actions/public-courses'
import { motion } from 'framer-motion'

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return minutes > 0 ? `${hours} 小時 ${minutes} 分鐘` : `${hours} 小時`
  }
  return `${minutes} 分鐘`
}

interface CourseCardProps {
  course: PublishedCourse
}

export function CourseCard({ course }: CourseCardProps) {
  const {
    slug,
    title,
    subtitle,
    coverImage,
    price,
    salePrice,
    saleEndAt,
    saleLabel,
    saleCycleEnabled,
    saleCycleDays,
    chapterCount,
    lessonCount,
    totalDuration,
  } = course

  // 使用共用的價格計算邏輯
  const { finalPrice, isOnSale, saleLabel: resolvedSaleLabel } = calculatePrice({
    originalPrice: price,
    salePrice,
    saleEndAt,
    saleLabel,
    saleCycleEnabled,
    saleCycleDays,
  })

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/courses/${slug}`} className="group block h-full">
        <Card className="h-full overflow-hidden border-[#E5E5E5] bg-white transition-all duration-300 hover:border-[#F5A524]/50 hover:shadow-xl hover:shadow-[#F5A524]/5">
          {/* 封面圖片 */}
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#F5F5F5]">
            {coverImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={coverImage}
                alt={title}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              // 預設封面
              <div className="flex h-full w-full items-center justify-center bg-[#FAFAFA]">
                <BookOpen className="h-10 w-10 text-[#D4D4D4]" />
              </div>
            )}
            
            {/* 上的標籤 (如果有特價) */}
            {isOnSale && (
              <div className="absolute left-4 top-4">
                <span className="rounded-full bg-[#F5A524] px-3 py-1 text-xs font-bold text-white shadow-sm">
                  {resolvedSaleLabel}
                </span>
              </div>
            )}
          </div>

          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-2">
              {/* 課程標題 */}
              <h3 className="line-clamp-2 text-xl font-bold text-[#0A0A0A] transition-colors group-hover:text-[#F5A524]">
                {title}
              </h3>

              {/* 課程副標題 */}
              {subtitle && (
                <p className="line-clamp-2 text-sm leading-relaxed text-[#525252]">
                  {subtitle}
                </p>
              )}
            </div>

            {/* 課程統計 */}
            <div className="flex items-center gap-4 text-xs font-medium text-[#A3A3A3]">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                {chapterCount} 章節
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                {lessonCount} 單元
              </span>
              {totalDuration > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(totalDuration)}
                </span>
              )}
            </div>

            {/* 分隔線 */}
            <div className="h-px bg-[#F5F5F5]" />

            {/* 價格與進入按鈕 */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-[#F5A524]">
                  {formatPrice(finalPrice)}
                </span>
                {isOnSale && (
                  <span className="text-sm text-[#A3A3A3] line-through">
                    {formatPrice(price)}
                  </span>
                )}
              </div>
              
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAFAFA] text-[#0A0A0A] transition-colors group-hover:bg-[#F5A524] group-hover:text-white">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
