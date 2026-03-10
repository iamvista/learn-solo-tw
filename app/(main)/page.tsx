// app/(main)/page.tsx
// 前台首頁
// VibeFlow Design System - 官網首頁佈局：Hero + 課程列表

import type { Metadata } from 'next'
import { getPublishedCourses, getCourseBySlug } from '@/lib/actions/public-courses'
import { LandingHeroSection } from '@/components/main/landing'
import { CourseGrid, CourseGridEmpty } from '@/components/main/course-grid'
import { JsonLd } from '@/components/common/json-ld'
import { getAppUrl } from '@/lib/app-url'

// 強制動態渲染（建置時無法連接 Zeabur 內部資料庫）
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    absolute: '線上課程平台',
  },
  description: '探索課程、購買學習並追蹤進度的線上課程平台。',
  alternates: {
    canonical: getAppUrl(),
  },
}

const appUrl = getAppUrl()

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Course Platform',
  url: appUrl,
  logo: `${appUrl}/icon.png`,
  description: '線上課程平台',
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: '線上課程平台',
  url: appUrl,
  description: '探索課程並開始學習',
  inLanguage: 'zh-TW',
  publisher: {
    '@type': 'Organization',
    name: 'Course Platform',
  },
}

export default async function HomePage() {
  // 取得所有已發佈課程
  const courses = await getPublishedCourses()
  
  // 取得主打課程 (預設取第一個，或指定 slug)
  // 如果沒有課程，則傳入 null 或處理空狀態
  const mainCourse = courses.length > 0 
    ? await getCourseBySlug(courses[0].slug)
    : null

  return (
    <main className="flex flex-col bg-white">
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />

      {/* 1. Hero Section - 與課程銷售頁風格一致 */}
      {mainCourse ? (
        <LandingHeroSection 
          course={mainCourse} 
          minimal={true}
        />
      ) : (
        // fallback hero if no courses exist
        <section className="bg-white py-20 text-center">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold text-[#0A0A0A] sm:text-6xl">
              探索精彩課程
            </h1>
            <p className="mt-6 text-lg text-[#525252]">
              即將推出精彩課程，敬請期待。
            </p>
          </div>
        </section>
      )}

      {/* 2. 課程列表區塊 - 重新設計的網格 */}
      <section id="courses" className="border-t border-[#F5F5F5] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-[#0A0A0A] sm:text-4xl">
              探索所有課程
            </h2>
            <p className="mt-4 text-lg text-[#525252]">
              從零基礎到精通，開始你的學習旅程
            </p>
          </div>
          
          {courses.length > 0 ? (
            <CourseGrid courses={courses} showTitle={false} />
          ) : (
            <CourseGridEmpty />
          )}
        </div>
      </section>

      {/* 簡單的底部 CTA (可選，但為了完整性增加) */}
      <section className="bg-[#0A0A0A] py-20 text-white rounded-[2.5rem] mx-4 mb-20 overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            別讓你的好點子，只停留在「我想過」
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-400">
            技術的門檻已經消失了。不管是為了工作效率、創業夢想，還是生活樂趣，你都已經具備了實現它的能力。
          </p>
        </div>
      </section>
    </main>
  )
}
