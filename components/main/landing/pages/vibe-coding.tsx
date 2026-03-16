// components/main/landing/pages/vibe-coding.tsx
// Vibe Coding 實戰課程 — 專屬銷售頁
// 講師：Vista | 目標受眾：非技術背景的創業者、自由工作者、行銷人

'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Shield,
  Clock,
  BookOpen,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  Rocket,
  Zap,
  Target,
  Code2,
  Palette,
  Globe,
  BarChart3,
  Users,
  Lightbulb,
  Play,
  Star,
} from 'lucide-react'
import type { LandingPageProps } from './types'
import { formatPrice } from '@/lib/utils/price'
import { CurriculumPreview, StickyCTA, FreeCourseCTA, AutoEnrollHandler } from '@/components/main/landing'
import { PurchasedCurriculumList } from '@/components/main/player/curriculum-list'

// ===== 頁面資料 =====

const targetAudience = [
  {
    icon: Lightbulb,
    title: '有好點子卻無法實現的人',
    description: '腦中有很多想法，但不知道怎麼把它變成真正的產品',
  },
  {
    icon: Target,
    title: '想建立數位資產的自由工作者',
    description: '不想只賣時間，想打造能持續帶來收入的線上工具或服務',
  },
  {
    icon: BarChart3,
    title: '行銷人 / 內容創作者',
    description: '想把行銷策略變成互動工具，快速驗證想法、蒐集名單',
  },
  {
    icon: Rocket,
    title: '想跨入 AI 時代的創業者',
    description: '知道 AI 很重要但不知道從哪開始，想用最短時間掌握核心能力',
  },
]

const courseHighlights = [
  {
    icon: MessageSquare,
    title: '用自然語言寫程式',
    description: '不需要學 JavaScript 或 Python，用中文描述需求，讓 AI 幫你寫出完整程式碼',
  },
  {
    icon: Palette,
    title: '從零到上線的完整流程',
    description: '涵蓋企劃、設計、開發、部署、分析的全流程，每一步都有實作',
  },
  {
    icon: Zap,
    title: '真實案例驅動教學',
    description: '不是理論課，每個章節都有可帶走的實際作品，包含網站、工具、Landing Page',
  },
  {
    icon: Globe,
    title: 'Prompt 工程實戰技巧',
    description: '學會和 AI 高效溝通的方法論，這套技巧適用於任何 AI 工具',
  },
]

const painPoints = [
  '腦中有很棒的想法，但找工程師報價太貴、等太久',
  '嘗試過 No-Code 工具，但功能受限、無法客製化',
  '想學寫程式，但看到程式碼就頭痛',
  '看到別人用 AI 做出很多東西，自己卻不知道從哪開始',
]

const transformations = [
  { before: '我有個好點子...', after: '我已經把它做出來了，今天就上線' },
  { before: '我需要找工程師', after: '我用 AI 3 小時就搞定了' },
  { before: '這個功能太複雜了', after: '跟 AI 講一下就好了嘛' },
  { before: '學程式好難...', after: '原來用自然語言就可以！' },
]

const vistaCredentials = [
  {
    icon: Code2,
    title: '全端工程師 × AI 實踐者',
    description: '獨立開發多個線上平臺，solo.tw、vista.tw 等產品從零到上線',
  },
  {
    icon: BookOpen,
    title: '10+ 場 Vibe Coding 工作坊',
    description: '已帶領上百位零基礎學員成功完成第一個作品',
  },
  {
    icon: Users,
    title: 'Vibe Coding 社群創辦人',
    description: '經營 2,400+ 人的 Vibe Coding 臺灣社群',
  },
]

const faqs = [
  {
    q: '完全不會寫程式也能上嗎？',
    a: '絕對可以！這門課就是為零基礎的人設計的。你只需要會打中文、會上網，就能跟著課程一步步完成作品。我們的工作坊已經有上百位完全沒寫過程式的學員成功產出。',
  },
  {
    q: '需要什麼軟體或工具？',
    a: '一臺能上網的電腦就夠了。課程中會使用 Cursor、Claude 等 AI 工具，我會在課程中手把手教你安裝和設定。',
  },
  {
    q: '線上課程和實體工作坊有什麼不同？',
    a: '線上課程內容更完整、更深入，而且可以反覆觀看。實體工作坊著重在 3 小時內完成一個作品，線上課程則涵蓋更多進階主題如商業變現、SEO、自動化等。',
  },
  {
    q: '買了之後可以看多久？',
    a: '永久觀看，沒有期限。而且未來新增的內容你也能免費取得。',
  },
  {
    q: '如果不滿意可以退費嗎？',
    a: '可以，我們提供 7 天退費保證。購買後 7 天內如果覺得不適合，可以申請全額退費，不需要任何理由。',
  },
]

// ===== 元件 =====

export default function VibeCodingLanding({
  course,
  purchaseStatus,
  isLoggedIn,
  isFree,
  finalPrice,
  originalPrice,
  isOnSale,
  saleLabel,
  shouldAutoEnroll,
}: LandingPageProps) {
  // 已購買
  if (purchaseStatus.isPurchased) {
    return (
      <div className="flex flex-col">
        <section className="bg-white py-12 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              已加入課程
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A] sm:text-5xl">
              {course.title}
            </h1>
            {course.subtitle && (
              <p className="mt-4 text-lg text-[#525252]">{course.subtitle}</p>
            )}
            {purchaseStatus.firstLessonId && (
              <Button asChild size="lg" className="mt-8 rounded-full bg-[#C41E3A] px-8 text-base font-semibold text-white hover:bg-[#A01830]">
                <Link href={`/courses/${course.slug}/lessons/${purchaseStatus.firstLessonId}`}>
                  繼續學習 <Play className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>
        </section>
        <PurchasedCurriculumList course={course} firstLessonId={purchaseStatus.firstLessonId} />
      </div>
    )
  }

  // 未購買 — 完整銷售頁
  return (
    <div className="flex flex-col">
      {shouldAutoEnroll && (
        <AutoEnrollHandler courseId={course.id} courseSlug={course.slug} />
      )}

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0A0A0A] to-[#1a1a2e] py-16 sm:py-24 lg:py-32">
        {/* 背景裝飾 */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-[#C41E3A] blur-[128px]" />
          <div className="absolute right-1/4 bottom-1/4 h-48 w-48 rounded-full bg-purple-600 blur-[96px]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#C41E3A]" />
              AI 時代的必備技能
            </span>
          </motion.div>

          {/* 主標題 */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl"
          >
            不寫程式，
            <br />
            <span className="bg-gradient-to-r from-[#C41E3A] to-[#FF6B6B] bg-clip-text text-transparent">
              也能打造你的數位產品
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-white/70 sm:text-xl"
          >
            學會用自然語言和 AI 協作，從想法到上線只需要一個下午。
            <br className="hidden sm:block" />
            這不是未來，這是現在。
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            {isFree ? (
              <FreeCourseCTA courseId={course.id} courseSlug={course.slug} isLoggedIn={isLoggedIn} />
            ) : (
              <Button asChild size="lg" className="rounded-full bg-[#C41E3A] px-10 py-7 text-lg font-bold text-white hover:bg-[#A01830] shadow-lg shadow-[#C41E3A]/25">
                <Link href={`/checkout?courseId=${course.id}`}>
                  立即加入課程 <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
          </motion.div>

          {/* 價格 + 信任標記 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm"
          >
            {isFree ? (
              <span className="font-semibold text-[#FF6B6B]">限時免費</span>
            ) : (
              <>
                {isOnSale && (
                  <span className="text-white/40 line-through">原價 {formatPrice(originalPrice)}</span>
                )}
                <span className="text-xl font-black text-white">{formatPrice(finalPrice)}</span>
                {saleLabel && (
                  <span className="rounded-full bg-[#C41E3A]/20 px-3 py-1 text-xs font-bold text-[#FF6B6B]">
                    {saleLabel}
                  </span>
                )}
              </>
            )}
            {!isFree && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-sm text-white/70">
                <Shield className="h-3.5 w-3.5" />
                7 日退費保證
              </span>
            )}
          </motion.div>

          {/* 課程概覽數字 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mx-auto mt-12 flex max-w-lg flex-wrap items-center justify-center gap-8 text-white/60"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#C41E3A]" />
              <span>{course.lessonCount} 個單元</span>
            </div>
            {course.totalDuration > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#C41E3A]" />
                <span>{Math.round(course.totalDuration / 60)} 分鐘</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#C41E3A]" />
              <span>永久觀看</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== 痛點區塊 ===== */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-sm font-bold tracking-widest text-[#C41E3A] uppercase">
              Sound Familiar?
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#0A0A0A] sm:text-3xl lg:text-4xl">
              你是不是也卡在這裡？
            </h2>
          </motion.div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {painPoints.map((point, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-5"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-[#C41E3A]">
                  ✕
                </span>
                <p className="text-[#525252]">{point}</p>
              </motion.div>
            ))}
          </div>

          {/* 轉折 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 rounded-2xl bg-[#0A0A0A] p-8 text-center sm:p-12"
          >
            <h3 className="text-2xl font-bold text-white sm:text-3xl">
              現在，規則改變了。
            </h3>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              2025 年起，AI 讓「用自然語言寫程式」成為現實。你不需要學程式語言，只需要學會和 AI 對話。
              這個方法叫做 <span className="font-bold text-[#FF6B6B]">Vibe Coding</span>。
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===== Before → After ===== */}
      <section className="bg-[#FAFAFA] py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-sm font-bold tracking-widest text-[#C41E3A] uppercase">
              Transformation
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#0A0A0A] sm:text-3xl lg:text-4xl">
              學完之後，你會變成這樣
            </h2>
          </motion.div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {transformations.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-white"
              >
                <div className="border-b border-[#E5E5E5] bg-[#FAFAFA] px-5 py-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">Before</span>
                  <p className="mt-1 text-[#525252] line-through decoration-red-300">{t.before}</p>
                </div>
                <div className="px-5 py-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C41E3A]">After</span>
                  <p className="mt-1 font-medium text-[#0A0A0A]">{t.after}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 適合誰 ===== */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-sm font-bold tracking-widest text-[#C41E3A] uppercase">
              Who Is This For
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#0A0A0A] sm:text-3xl lg:text-4xl">
              這門課適合你嗎？
            </h2>
          </motion.div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {targetAudience.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group flex gap-4 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-6 transition-all hover:border-[#C41E3A]/40 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#0A0A0A] border border-[#E5E5E5] group-hover:bg-[#C41E3A] group-hover:text-white transition-colors">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0A0A0A]">{item.title}</h3>
                  <p className="mt-1 text-sm text-[#525252]">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 課程亮點 ===== */}
      <section className="bg-[#0A0A0A] py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-sm font-bold tracking-widest text-[#C41E3A] uppercase">
              What You'll Learn
            </p>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
              這門課會教你什麼
            </h2>
          </motion.div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {courseHighlights.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C41E3A]/20 text-[#FF6B6B]">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 課程大綱 ===== */}
      <CurriculumPreview course={course} />

      {/* ===== 講師介紹 ===== */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-sm font-bold tracking-widest text-[#C41E3A] uppercase">
              Your Instructor
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#0A0A0A] sm:text-3xl lg:text-4xl">
              你的講師
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="mt-10 overflow-hidden rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA]"
          >
            <div className="flex flex-col lg:flex-row">
              {/* 左側：人物 */}
              <div className="flex flex-col items-center justify-center border-b border-[#E5E5E5] bg-white p-8 lg:w-1/3 lg:border-b-0 lg:border-r">
                <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-[#FAFAFA] bg-gradient-to-br from-[#C41E3A] to-[#FF6B6B] text-5xl font-bold text-white sm:h-40 sm:w-40">
                  V
                </div>
                <h3 className="mt-5 text-xl font-bold text-[#0A0A0A] sm:text-2xl">
                  Vista
                </h3>
                <p className="mt-2 text-center text-sm font-medium text-[#525252]">
                  全端工程師 / AI 實踐者 / 自由人學院創辦人
                </p>
              </div>

              {/* 右側 */}
              <div className="flex-1 p-6 sm:p-8 lg:p-10">
                <div className="relative">
                  <span className="absolute -left-3 -top-4 text-6xl font-serif text-[#E5E5E5]/50">
                    &ldquo;
                  </span>
                  <blockquote className="relative z-10 text-lg font-medium leading-relaxed text-[#0A0A0A] italic sm:text-xl">
                    我相信每個人都有能力打造自己的數位產品。
                    <br />
                    Vibe Coding 讓「不會寫程式」不再是藉口，而是一種全新的創作方式。
                  </blockquote>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {vistaCredentials.map((item, i) => (
                    <div key={i} className="group">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#0A0A0A] border border-[#E5E5E5] group-hover:bg-[#C41E3A] group-hover:text-white transition-colors">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <h4 className="mt-3 text-sm font-bold text-[#0A0A0A]">{item.title}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-[#525252]">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="bg-[#FAFAFA] py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-sm font-bold tracking-widest text-[#C41E3A] uppercase">
              F.A.Q
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#0A0A0A] sm:text-3xl lg:text-4xl">
              常見問題
            </h2>
          </motion.div>

          <div className="mt-10 space-y-3">
            {faqs.map((faq, i) => (
              <motion.details
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white"
              >
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-bold text-[#0A0A0A] hover:text-[#C41E3A] transition-colors sm:text-base [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="ml-2 shrink-0 text-[#A3A3A3] transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="px-5 pb-5 text-sm leading-relaxed text-[#525252] sm:text-base">
                  {faq.a}
                </div>
              </motion.details>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-[#A3A3A3]">
              還有其他問題？
              <a href="mailto:iamvista@gmail.com" className="ml-1.5 font-bold text-[#0A0A0A] underline decoration-[#C41E3A] decoration-2 underline-offset-4 hover:text-[#C41E3A] transition-colors">
                聯繫我們
              </a>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===== 最終 CTA ===== */}
      <section className="bg-gradient-to-b from-[#0A0A0A] to-[#1a1a2e] py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold sm:text-4xl">
              別讓好點子只停留在「我想過」
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60">
              AI 已經把技術門檻降到最低。你只需要一個想法，和願意開始的決心。
            </p>
            <div className="mt-10">
              {isFree ? (
                <FreeCourseCTA courseId={course.id} courseSlug={course.slug} isLoggedIn={isLoggedIn} />
              ) : (
                <Button asChild size="lg" className="rounded-full bg-[#C41E3A] px-10 py-7 text-lg font-bold text-white hover:bg-[#A01830] shadow-lg shadow-[#C41E3A]/25">
                  <Link href={`/checkout?courseId=${course.id}`}>
                    立即加入課程 <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              )}
            </div>
            {!isFree && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-white/50">
                {isOnSale && (
                  <span className="line-through">原價 {formatPrice(originalPrice)}</span>
                )}
                <span className="text-lg font-bold text-white">{formatPrice(finalPrice)}</span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  7 日退費保證
                </span>
              </div>
            )}
          </motion.div>
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
