// app/(main)/courses/page.tsx
// 前台課程列表頁面
// Solo Academy Design System - 極簡白黑風格

import type { Metadata } from 'next'
import { CourseGrid, CourseGridEmpty } from '@/components/main/course-grid'
import { getPublishedCourses } from '@/lib/actions/public-courses'
import { getPublicSiteSettings } from '@/lib/site-settings-public'
import { getAppUrl } from '@/lib/app-url'

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = getAppUrl()
  const { siteName } = await getPublicSiteSettings()

  return {
    title: '所有課程',
    description: `探索${siteName}所有課程。`,
    openGraph: {
      title: `所有課程 | ${siteName}`,
      description: `探索${siteName}所有課程。`,
      url: `${baseUrl}/courses`,
    },
    alternates: {
      canonical: `${baseUrl}/courses`,
    },
  }
}

// 強制動態渲染（建置時無法連接 Zeabur 內部資料庫）
export const dynamic = 'force-dynamic'

export default async function CoursesPage() {
  const courses = await getPublishedCourses()

  return (
    <div className="min-h-screen bg-white">
      {/* 頁面標題區 - Solo Academy 風格 */}
      <section className="bg-[#FAFAFA] border-b border-[#E5E5E5] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-[#0A0A0A] sm:text-5xl">
            所有課程
          </h1>
          <p className="mt-6 text-xl text-[#525252] max-w-2xl">
            探索我們精心設計的課程，開始你的學習旅程。
          </p>
        </div>
      </section>

      {/* 課程列表 */}
      <div className="py-12">
        {courses.length > 0 ? (
          <CourseGrid courses={courses} showTitle={false} />
        ) : (
          <CourseGridEmpty />
        )}
      </div>
      
      {/* 底部裝飾 */}
      <div className="pb-20" />
    </div>
  )
}
