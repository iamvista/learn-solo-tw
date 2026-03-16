// app/(main)/page.tsx
// 前臺首頁 — 自由人學院
// Dark gradient hero + 課程預覽 + 平臺特色 + CTA

import type { Metadata } from "next";
import Link from "next/link";
import {
  getPublishedCourses,
  getCourseBySlug,
} from "@/lib/actions/public-courses";
import { LandingHeroSection } from "@/components/main/landing";
import { CourseGrid, CourseGridEmpty } from "@/components/main/course-grid";
import { JsonLd } from "@/components/common/json-ld";
import { getAppUrl } from "@/lib/app-url";
import { getPublicSiteSettings } from "@/lib/site-settings-public";

// 強制動態渲染（建置時無法連接 Zeabur 內部資料庫）
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getPublicSiteSettings();
  const appUrl = getAppUrl();

  return {
    title: {
      absolute: siteName,
    },
    description: `${siteName} — 不寫程式也能做出自己的 App。探索 AI 時代的實作課程，從零到上架。`,
    alternates: {
      canonical: appUrl,
    },
  };
}

export default async function HomePage() {
  // 取得所有已發佈課程和設定
  const [courses, { siteName, siteLogo, contactEmail, footerSections }] =
    await Promise.all([getPublishedCourses(), getPublicSiteSettings()]);

  const appUrl = getAppUrl();

  // 取得主打課程 (預設取第一個，或指定 slug)
  const mainCourse =
    courses.length > 0 ? await getCourseBySlug(courses[0].slug) : null;

  // 從 footer 中提取社群連結作為 Organization sameAs
  const socialLinks = footerSections
    .flatMap((section) => section.links)
    .map((link) => link.url)
    .filter((url) => url.startsWith("http"));

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: appUrl,
    logo: `${appUrl}${siteLogo || "/icon.png"}`,
    description: `${siteName} — 線上課程平臺`,
    contactPoint: {
      "@type": "ContactPoint",
      email: contactEmail,
      contactType: "customer service",
      availableLanguage: "zh-TW",
    },
    ...(socialLinks.length > 0 ? { sameAs: socialLinks } : {}),
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: appUrl,
    description: `${siteName} — 探索課程並開始學習`,
    inLanguage: "zh-TW",
    publisher: {
      "@type": "Organization",
      name: siteName,
    },
  };

  // 課程列表結構化資料（影響 Google 課程輪播）
  const courseListJsonLd =
    courses.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "精選課程",
          numberOfItems: courses.length,
          itemListElement: courses.map((course, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${appUrl}/courses/${course.slug}`,
            name: course.title,
            ...(course.coverImage ? { image: course.coverImage } : {}),
          })),
        }
      : null;

  const hasPublishedCourses = courses.length > 0;

  return (
    <main className="flex flex-col bg-white">
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />
      {courseListJsonLd && <JsonLd data={courseListJsonLd} />}

      {/* 1. Hero Section */}
      {mainCourse ? (
        <LandingHeroSection course={mainCourse} minimal={true} />
      ) : (
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0A0A0A] via-[#1a1a2e] to-[#16213e] py-24 sm:py-32">
          {/* 背景裝飾 */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary/80">
              自由人學院
            </p>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              不寫程式，
              <br className="sm:hidden" />
              也能打造你的
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                數位產品
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-300 sm:text-xl">
              AI 時代的實戰課程。從想法到上線，帶你掌握用自然語言和 AI 協作打造產品的全新技能。
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <a
                href="#courses"
                className="inline-flex items-center rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg transition hover:opacity-90"
              >
                探索課程
              </a>
            </div>
          </div>
        </section>
      )}

      {/* 2. 即將推出的課程預覽 (當尚無已發佈課程時顯示) */}
      {!hasPublishedCourses && (
        <section className="border-b border-neutral-100 py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                Coming Soon
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0A0A0A] sm:text-4xl">
                首發課程
              </h2>
            </div>

            {/* Vibe Coding 課程預覽卡 */}
            <Link
              href="/courses/vibe-coding"
              className="group block overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0A0A] via-[#1a1a2e] to-[#16213e] p-8 shadow-xl transition hover:shadow-2xl sm:p-10"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12">
                <div className="flex-1">
                  <span className="inline-block rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
                    早鳥優惠中
                  </span>
                  <h3 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
                    Vibe Coding 實戰課程
                  </h3>
                  <p className="mt-2 text-lg text-neutral-300">
                    不寫程式也能打造你的數位產品
                  </p>
                  <p className="mt-4 leading-relaxed text-neutral-400">
                    學會用自然語言和 AI 協作，從想法到上線只需要一個下午。
                    專為零程式基礎的創業者、自由工作者、行銷人設計。
                  </p>
                  <div className="mt-6 flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-white">
                      NT$2,980
                    </span>
                    <span className="text-lg text-neutral-500 line-through">
                      NT$3,980
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-4xl">
                    🚀
                  </div>
                  <span className="text-sm font-medium text-neutral-400 transition group-hover:text-primary">
                    瞭解更多 →
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* 3. 已發佈課程列表 */}
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

          {hasPublishedCourses ? (
            <CourseGrid courses={courses} showTitle={false} />
          ) : (
            <CourseGridEmpty />
          )}
        </div>
      </section>

      {/* 4. 平臺特色 */}
      <section className="border-t border-neutral-100 bg-neutral-50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-[#0A0A0A] sm:text-4xl">
            為什麼選擇自由人學院？
          </h2>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "🎯",
                title: "實戰導向",
                desc: "每堂課都有動手做的環節，學完就能產出自己的作品。",
              },
              {
                icon: "🤖",
                title: "AI 原生教學",
                desc: "課程設計融合 AI 工具，教你用最現代的方式完成工作。",
              },
              {
                icon: "🔄",
                title: "持續更新",
                desc: "AI 技術日新月異，課程內容持續迭代，買一次永久觀看。",
              },
              {
                icon: "💬",
                title: "社群支援",
                desc: "加入 2,400+ 人的 Vibe Coding 臺灣社群，一起學習成長。",
              },
              {
                icon: "📱",
                title: "隨時隨地",
                desc: "手機、平板、電腦都能上課，零碎時間也能學習。",
              },
              {
                icon: "✅",
                title: "無風險",
                desc: "7 天內不滿意全額退費，你可以放心嘗試。",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl bg-white p-6 shadow-sm"
              >
                <div className="mb-3 text-3xl">{feature.icon}</div>
                <h3 className="mb-2 text-lg font-bold text-[#0A0A0A]">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#525252]">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. 底部 CTA */}
      <section className="mx-4 mb-20 overflow-hidden rounded-[2.5rem] bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            別讓你的好點子，只停留在「我想過」
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-400">
            技術的門檻已經消失了。不管是為了工作效率、創業夢想，還是生活樂趣，你都已經具備了實現它的能力。
          </p>
          <div className="mt-10">
            <Link
              href="/courses"
              className="inline-flex items-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#0A0A0A] shadow-lg transition hover:bg-neutral-100"
            >
              瀏覽所有課程
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
