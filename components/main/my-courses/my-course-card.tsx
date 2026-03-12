// components/main/my-courses/my-course-card.tsx
// 我的課程卡片 - 顯示課程封面、進度和狀態

'use client'

import Link from 'next/link'
import { BookOpen, CheckCircle2, PlayCircle, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { MyCourse } from '@/lib/actions/my-courses'

interface MyCourseCardProps {
  course: MyCourse
  index: number
}

export function MyCourseCard({ course, index }: MyCourseCardProps) {
  const { progress, isCompleted, lastLesson } = course

  // 決定跳轉目標
  const targetUrl = lastLesson
    ? `/courses/${course.slug}/lessons/${lastLesson.id}`
    : `/courses/${course.slug}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link href={targetUrl} className="group block h-full">
        <Card className="h-full overflow-hidden border-[#E5E5E5] bg-white transition-all duration-300 hover:border-[#C41E3A]/30 hover:shadow-xl hover:shadow-[#C41E3A]/5">
          {/* 封面圖片區域 */}
          <div className="relative aspect-video overflow-hidden">
            {course.coverImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={course.coverImage}
                alt={course.title}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#F5F5F5]">
                <BookOpen className="h-12 w-12 text-[#A3A3A3]" />
              </div>
            )}

            {/* 已完成徽章 */}
            {isCompleted && (
              <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                <CheckCircle2 className="h-4 w-4 text-[#C41E3A]" />
                <span className="text-xs font-bold text-[#0A0A0A]">
                  已完成
                </span>
              </div>
            )}

            {/* 進度條覆蓋在圖片底部 */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/20 to-transparent">
              <Progress
                value={progress.progressPercentage}
                className="h-1.5 bg-white/30"
                indicatorClassName="bg-[#C41E3A]"
              />
            </div>

            {/* Hover 狀態 Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
               <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#C41E3A] text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <PlayCircle className="h-6 w-6 fill-current" />
               </div>
            </div>
          </div>

          {/* 課程資訊 */}
          <CardContent className="flex flex-col flex-1 p-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                 <span className="inline-block rounded-md bg-[#F5F5F5] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">
                    {isCompleted ? 'Finished' : 'Learning'}
                 </span>
              </div>
              
              <h3 className="line-clamp-2 text-xl font-bold text-[#0A0A0A] transition-colors group-hover:text-[#C41E3A]">
                {course.title}
              </h3>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#525252]">
                    {progress.completedLessons} / {progress.totalLessons} 單元
                  </span>
                  <span className="font-bold text-[#0A0A0A]">
                    {progress.progressPercentage}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-[#F5F5F5] pt-4">
               <span className="text-sm font-medium text-[#525252] flex items-center gap-1">
                  {isCompleted ? '重新觀看' : '繼續學習'}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
               </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

