// app/(main)/courses/page.tsx
// 前臺課程列表頁面
// Solo Academy Design System - 極簡白黑風格

import type { Metadata } from "next";
import { CourseGrid, CourseGridEmpty } from "@/components/main/course-grid";
import { getPublishedCourses } from "@/lib/actions/public-courses";
import { getPublicSiteSettings } from "@/lib/site-settings-public";
import { getAppUrl } from "@/lib/app-url";
import { JsonLd } from "@/components/common/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = getAppUrl();
  const { siteName } = await getPublicSiteSettings();

  const description = `瀏覽${siteName}的所有線上課程，從零基礎到進階，找到適合你的學習路徑。`;

  return {
    title: "所有課程",
    description,
    keywords: ["線上課程", siteName, "程式教學", "AI 課程"],
    openGraph: {
      title: `所有課程 | ${siteName}`,
      description,
      url: `${baseUrl}/courses`,
    },
    alternates: {
      canonical: `${baseUrl}/courses`,
    },
  };
}

// 強制動態渲染（建置時無法連接 Zeabur 內部資料庫）
export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const courses = await getPublishedCourses();
  const baseUrl = getAppUrl();

  // BreadcrumbList 結構化資料
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首頁", item: baseUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "課程",
        item: `${baseUrl}/courses`,
      },
    ],
  };

  // ItemList 結構化資料（影響 Google 課程輪播）
  const courseListJsonLd =
    courses.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "所有課程",
          numberOfItems: courses.length,
          itemListElement: courses.map((course, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${baseUrl}/courses/${course.slug}`,
            name: course.title,
            ...(course.coverImage ? { image: course.coverImage } : {}),
          })),
        }
      : null;

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={breadcrumbJsonLd} />
      {courseListJsonLd && <JsonLd data={courseListJsonLd} />}
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
  );
}
