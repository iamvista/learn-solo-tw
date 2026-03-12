// components/main/my-courses/continue-learning-card.tsx
// 繼續學習 Hero Card - 突出顯示最近觀觀的課程

'use client'

import Link from 'next/link'
import { PlayCircle, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { ContinueLearningData } from '@/lib/actions/my-courses'

interface ContinueLearningCardProps {
  data: ContinueLearningData
}

export function ContinueLearningCard({ data }: ContinueLearningCardProps) {
  const { course, lesson, progress } = data

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-[#0A0A0A]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C41E3A]/10">
            <PlayCircle className="h-5 w-5 text-[#C41E3A]" />
          </span>
          繼續學習
        </h2>
      </div>

      <Card className="overflow-hidden border-[#E5E5E5] bg-white transition-all duration-300 hover:border-[#C41E3A]/30 hover:shadow-xl hover:shadow-[#C41E3A]/5">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* 封面圖片 */}
            <div className="relative aspect-video w-full overflow-hidden md:aspect-auto md:w-80 lg:w-[400px]">
              {course.coverImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={course.coverImage}
                  alt={course.title}
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#F5F5F5]">
                  <PlayCircle className="h-12 w-12 text-[#A3A3A3]" />
                </div>
              )}
            </div>

            {/* 課程資訊 */}
            <div className="flex flex-1 flex-col justify-between p-6 sm:p-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#F5F5F5] px-2 py-1 text-xs font-medium text-[#525252]">
                      最近觀看
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#0A0A0A] sm:text-3xl">
                    {course.title}
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-[#525252]">目前進度</span>
                      <span className="font-bold text-[#C41E3A]">{progress.progressPercentage}%</span>
                    </div>
                    <Progress
                      value={progress.progressPercentage}
                      className="h-2 bg-[#F5F5F5]"
                      indicatorClassName="bg-[#C41E3A]"
                    />
                    <p className="text-xs text-[#A3A3A3]">
                      已完成 {progress.completedLessons} / {progress.totalLessons} 單元
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#FAFAFA] p-4 border border-[#F5F5F5]">
                    <p className="text-xs font-medium uppercase tracking-wider text-[#A3A3A3]">章節內容</p>
                    <p className="mt-1 font-semibold text-[#0A0A0A] line-clamp-1">
                      {lesson.chapterTitle}: {lesson.title}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
                <Button
                  asChild
                  className="w-full rounded-full bg-[#C41E3A] px-8 py-6 text-base font-semibold text-white transition-all hover:bg-[#A01830] hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
                >
                  <Link href={`/courses/${course.slug}/lessons/${lesson.id}`}>
                    繼續上課
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                
                <Link 
                  href={`/courses/${course.slug}`}
                  className="text-sm font-medium text-[#525252] transition-colors hover:text-[#0A0A0A]"
                >
                  查看所有章節
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  )
}

