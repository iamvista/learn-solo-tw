// components/main/landing/pages/test-course.tsx
// Demo 銷售頁 — 旋轉動畫 + 倒數計時器

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Zap, Star, Sparkles, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils/price'
import type { LandingPageProps } from './types'
import { StickyCTA, FreeCourseCTA, AutoEnrollHandler } from '@/components/main/landing'
import { PurchasedCurriculumList } from '@/components/main/player/curriculum-list'

// 倒數計時 Hook
function useCountdown(targetDate: Date | null) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    // 如果沒有目標日期，預設倒數到 24 小時後（demo 用）
    const target = targetDate ? new Date(targetDate).getTime() : Date.now() + 24 * 60 * 60 * 1000

    function calculate() {
      const now = Date.now()
      const diff = Math.max(0, target - now)
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      })
    }

    calculate()
    const timer = setInterval(calculate, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  return timeLeft
}

// 倒數時鐘元件
function CountdownTimer({ targetDate }: { targetDate: Date | null }) {
  const { days, hours, minutes, seconds } = useCountdown(targetDate)

  const blocks = [
    { label: '天', value: days },
    { label: '時', value: hours },
    { label: '分', value: minutes },
    { label: '秒', value: seconds },
  ]

  return (
    <div className="flex items-center gap-3">
      {blocks.map((block, i) => (
        <div key={block.label} className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm sm:h-20 sm:w-20">
              <span className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
                {String(block.value).padStart(2, '0')}
              </span>
            </div>
            <span className="mt-1.5 text-xs text-white/60">{block.label}</span>
          </div>
          {i < blocks.length - 1 && (
            <span className="mb-4 text-xl font-bold text-white/40">:</span>
          )}
        </div>
      ))}
    </div>
  )
}

// 旋轉裝飾元素
function SpinningOrbit() {
  const orbitItems = [
    { icon: Zap, color: 'text-yellow-400', size: 'h-6 w-6', radius: 100 },
    { icon: Star, color: 'text-pink-400', size: 'h-5 w-5', radius: 100 },
    { icon: Sparkles, color: 'text-cyan-400', size: 'h-6 w-6', radius: 100 },
    { icon: Rocket, color: 'text-orange-400', size: 'h-5 w-5', radius: 100 },
  ]

  return (
    <div className="relative mx-auto h-64 w-64 sm:h-80 sm:w-80">
      {/* 中心 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/30 sm:h-32 sm:w-32"
        >
          <span className="text-3xl font-black text-white sm:text-4xl">D</span>
        </motion.div>
      </div>

      {/* 軌道環 */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0"
      >
        {orbitItems.map((item, i) => {
          const angle = (i / orbitItems.length) * 360
          const rad = (angle * Math.PI) / 180
          const x = Math.cos(rad) * item.radius
          const y = Math.sin(rad) * item.radius
          const Icon = item.icon
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2"
              style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
            >
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm sm:h-12 sm:w-12">
                  <Icon className={`${item.size} ${item.color}`} />
                </div>
              </motion.div>
            </div>
          )
        })}
      </motion.div>

      {/* 外圈虛線軌道 */}
      <div className="absolute inset-6 rounded-full border border-dashed border-white/10 sm:inset-8" />
    </div>
  )
}

export default function TestCourseLanding({
  course,
  purchaseStatus,
  isLoggedIn,
  isFree,
  finalPrice,
  originalPrice,
  isOnSale,
  countdownTarget,
  shouldAutoEnroll,
}: LandingPageProps) {
  // 已購買
  if (purchaseStatus.isPurchased) {
    return (
      <div className="flex flex-col">
        <section className="bg-gradient-to-b from-[#0f0f1a] to-[#1a1a2e] py-12 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-white sm:text-5xl">{course.title}</h1>
            {course.subtitle && (
              <p className="mt-4 text-lg text-white/60">{course.subtitle}</p>
            )}
            {purchaseStatus.firstLessonId && (
              <Button asChild size="lg" className="mt-8 rounded-full bg-primary px-8 text-base font-semibold text-white hover:bg-primary/90">
                <Link href={`/courses/${course.slug}/lessons/${purchaseStatus.firstLessonId}`}>
                  進入課程 <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>
        </section>
        <PurchasedCurriculumList course={course} firstLessonId={purchaseStatus.firstLessonId} />
      </div>
    )
  }

  // 未購買
  return (
    <div className="flex flex-col">
      {shouldAutoEnroll && (
        <AutoEnrollHandler courseId={course.id} courseSlug={course.slug} />
      )}

      {/* Hero — 深色背景 + 旋轉動畫 + 倒數 */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0f0f1a] to-[#1a1a2e] py-16 sm:py-24">
        {/* 背景裝飾 */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
            {/* 左側文字 */}
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-block rounded-full bg-primary/20 px-4 py-1.5 text-sm font-medium text-primary">
                  Demo 課程
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-5xl"
              >
                {course.title}
              </motion.h1>

              {course.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mt-4 text-lg text-white/60"
                >
                  {course.subtitle}
                </motion.p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-8"
              >
                {isFree ? (
                  <FreeCourseCTA courseId={course.id} courseSlug={course.slug} isLoggedIn={isLoggedIn} />
                ) : (
                  <div className="flex flex-col items-center gap-3 lg:items-start">
                    <Button asChild size="lg" className="rounded-full bg-primary px-8 py-6 text-base font-semibold text-white hover:bg-primary/90">
                      <Link href={`/checkout?courseId=${course.id}`}>
                        立即加入課程 <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <div className="flex items-center gap-3 text-sm">
                      {isOnSale && (
                        <span className="text-white/40 line-through">{formatPrice(originalPrice)}</span>
                      )}
                      <span className="text-lg font-bold text-white">{formatPrice(finalPrice)}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* 右側旋轉動畫 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-shrink-0"
            >
              <SpinningOrbit />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 倒數計時區塊 */}
      <section className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] py-10">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
              限時優惠倒數
            </p>
            <div className="flex justify-center">
              <CountdownTimer targetDate={countdownTarget} />
            </div>
            <p className="mt-4 text-sm text-white/40">
              優惠結束後將恢復原價
            </p>
          </motion.div>
        </div>
      </section>

      {/* 特點區塊 */}
      <section className="bg-[#fafafa] py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-2xl font-bold text-foreground sm:text-3xl"
          >
            這堂課包含什麼？
          </motion.h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { icon: Zap, title: '即學即用', desc: '實戰導向的課程內容' },
              { icon: Star, title: '永久觀看', desc: '一次購買，終身回顧' },
              { icon: Rocket, title: '持續更新', desc: '內容持續新增與優化' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-white p-6 text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 底部 CTA */}
      <section className="bg-[#0f0f1a] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold sm:text-3xl">準備好開始了嗎？</h2>
            <p className="mt-3 text-white/60">現在加入，開始你的學習之旅</p>
          </motion.div>
          <div className="mt-8 flex justify-center">
            {isFree ? (
              <FreeCourseCTA courseId={course.id} courseSlug={course.slug} isLoggedIn={isLoggedIn} />
            ) : (
              <Button asChild size="lg" className="rounded-full bg-primary px-8 py-6 text-base font-semibold text-white hover:bg-primary/90">
                <Link href={`/checkout?courseId=${course.id}`}>
                  立即加入課程 <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Sticky CTA */}
      <StickyCTA
        courseId={course.id}
        courseSlug={course.slug}
        finalPrice={finalPrice}
        originalPrice={originalPrice}
        isOnSale={isOnSale}
        isFree={isFree}
        isLoggedIn={isLoggedIn}
      />
    </div>
  )
}
