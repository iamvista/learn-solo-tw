// app/(main)/courses/[slug]/page.tsx
// 課程銷售頁 Dispatcher
// 根據課程設定載入對應的 React 銷售頁元件或渲染 HTML

import { notFound } from "next/navigation";
import { Metadata } from "next";
import {
  getCourseBySlug,
  checkCoursePurchased,
} from "@/lib/actions/public-courses";
import { auth } from "@/lib/auth";
import { calculatePrice } from "@/lib/utils/price";
import { headers } from "next/headers";
import crypto from "crypto";
import { MetaPixelViewContent } from "@/components/common/meta-pixel-events";
import { PostHogPageView } from "@/components/common/posthog-events";
import { sendMetaCAPIViewContentEvent } from "@/lib/meta-capi";
import { JsonLd } from "@/components/common/json-ld";
import { loadLandingPage } from "@/components/main/landing/pages/loader";
import { getPublicSiteSettings } from "@/lib/site-settings-public";
import { getAppUrl } from "@/lib/app-url";

// 強制動態渲染
export const dynamic = "force-dynamic";

interface CoursePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ enroll?: string }>;
}

// 動態產生 Metadata
export async function generateMetadata({
  params,
}: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    return {
      title: "找不到課程",
    };
  }

  // 動態生成帶價格資訊的 description
  const priceInfo = calculatePrice({
    originalPrice: course.price,
    salePrice: course.salePrice,
    saleEndAt: course.saleEndAt,
    saleLabel: course.saleLabel,
    saleCycleEnabled: course.saleCycleEnabled,
    saleCycleDays: course.saleCycleDays,
  });
  const priceText =
    priceInfo.finalPrice === 0
      ? "限時免費"
      : priceInfo.isOnSale
        ? `${priceInfo.saleLabel} NT$ ${priceInfo.finalPrice.toLocaleString()}`
        : `NT$ ${priceInfo.finalPrice.toLocaleString()}`;

  const baseUrl = getAppUrl();
  const courseUrl = `${baseUrl}/courses/${slug}`;
  const { siteName } = await getPublicSiteSettings();

  // 優先使用管理後臺設定的 SEO 內容，fallback 到自動生成
  const title = course.seoTitle || `${course.title} | ${siteName}`;
  const description =
    course.seoDesc || `${course.description || course.title}。${priceText}`;
  const keywords = course.seoKeywords
    ? course.seoKeywords.split(",").map((k) => k.trim())
    : [course.title];

  // OG 專用：優先使用 ogDescription / ogImage，fallback 到 SEO / cover
  const ogDescription = course.ogDescription || description;
  const ogImage = course.ogImage || course.coverImage;

  return {
    title,
    description,
    keywords,
    openGraph: {
      type: "website",
      locale: "zh_TW",
      url: courseUrl,
      siteName: `${siteName} 課程平臺`,
      title: course.title,
      description: ogDescription,
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: course.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: course.title,
      description: ogDescription,
      images: ogImage ? [ogImage] : undefined,
    },
    alternates: {
      canonical: courseUrl,
    },
  };
}

export default async function CoursePage({
  params,
  searchParams,
}: CoursePageProps) {
  const { slug } = await params;
  const { enroll } = await searchParams;
  const course = await getCourseBySlug(slug);
  const publicSettings = await getPublicSiteSettings();

  // 課程不存在則顯示 404
  if (!course) {
    notFound();
  }

  // 取得登入狀態
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  // 檢查用戶是否已購買此課程
  const purchaseStatus = await checkCoursePurchased(course.id);

  // 判斷是否為免費課程（考慮促銷價）
  const priceResult = calculatePrice({
    originalPrice: course.price,
    salePrice: course.salePrice,
    saleEndAt: course.saleEndAt,
    saleLabel: course.saleLabel,
    saleCycleEnabled: course.saleCycleEnabled,
    saleCycleDays: course.saleCycleDays,
  });
  const isFree = priceResult.finalPrice === 0;

  // 檢查是否需要自動加入（登入後回調）
  const shouldAutoEnroll =
    enroll === "true" && isFree && isLoggedIn && !purchaseStatus.isPurchased;

  // Meta CAPI: 發送 ViewContent 事件（非阻塞，不影響頁面渲染）
  const viewContentEventId = !purchaseStatus.isPurchased
    ? crypto.randomUUID()
    : undefined;

  if (!purchaseStatus.isPurchased) {
    const headersList = await headers();
    sendMetaCAPIViewContentEvent({
      contentName: course.title,
      contentId: course.id,
      value: priceResult.finalPrice,
      userEmail: session?.user?.email,
      clientIpAddress: headersList
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim(),
      clientUserAgent: headersList.get("user-agent"),
      eventId: viewContentEventId,
    }).catch(() => {}); // 靜默處理錯誤，不影響頁面
  }

  // 建構 JSON-LD 結構化資料（使用 DB 欄位，提供合理 fallback）
  const baseUrl = getAppUrl();

  const instructorName =
    course.instructorName || publicSettings.brandDisplayName;
  const instructorTitle = course.instructorTitle || "全端工程師";
  const instructorDesc = course.instructorDesc || "資深講師";
  const courseWorkload = course.courseWorkload || "PT2H30M";
  const ratingValue = course.ratingValue || "5";
  const ratingCount = course.ratingCount || "400";

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description || course.title,
    url: `${baseUrl}/courses/${slug}`,
    image: course.coverImage || undefined,
    provider: {
      "@type": "Organization",
      name: publicSettings.siteName,
      url: baseUrl,
    },
    instructor: {
      "@type": "Person",
      name: instructorName,
      description: instructorDesc,
      jobTitle: instructorTitle,
    },
    inLanguage: "zh-TW",
    courseMode: "online",
    isAccessibleForFree: priceResult.finalPrice === 0,
    offers: {
      "@type": "Offer",
      price: priceResult.finalPrice,
      priceCurrency: "TWD",
      availability: "https://schema.org/InStock",
      url: `${baseUrl}/courses/${slug}`,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue,
      bestRating: "5",
      ratingCount,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload,
      instructor: {
        "@type": "Person",
        name: instructorName,
      },
    },
  };

  // BreadcrumbList 結構化資料
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "首頁",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "課程",
        item: `${baseUrl}/courses`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: course.title,
        item: `${baseUrl}/courses/${slug}`,
      },
    ],
  };

  // 共用的追蹤事件和 JSON-LD
  const trackingAndJsonLd = (
    <>
      <JsonLd data={courseJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      {!purchaseStatus.isPurchased && (
        <>
          <MetaPixelViewContent
            contentName={course.title}
            contentId={course.id}
            value={priceResult.finalPrice}
            eventId={viewContentEventId}
          />
          <PostHogPageView
            event="course_viewed"
            properties={{
              course_id: course.id,
              course_slug: course.slug,
              course_title: course.title,
              final_price: priceResult.finalPrice,
              original_price: course.price,
              is_on_sale: priceResult.isOnSale,
              is_free: isFree,
              currency: "TWD",
            }}
          />
        </>
      )}
    </>
  );

  // === 銷售頁渲染 ===
  const mode = course.landingPageMode ?? "react";

  // HTML 模式：SSR 直出
  if (mode === "html" && course.landingPageHtml) {
    return (
      <div className="flex flex-col">
        {trackingAndJsonLd}
        <div dangerouslySetInnerHTML={{ __html: course.landingPageHtml }} />
      </div>
    );
  }

  // React 模式：動態載入對應的銷售頁元件
  const pageSlug = course.landingPageSlug || slug;
  const LandingPage = await loadLandingPage(pageSlug);

  return (
    <div className="flex flex-col">
      {trackingAndJsonLd}
      <LandingPage
        course={course}
        purchaseStatus={purchaseStatus}
        isLoggedIn={isLoggedIn}
        isFree={isFree}
        finalPrice={priceResult.finalPrice}
        originalPrice={course.price}
        isOnSale={priceResult.isOnSale}
        saleEndAt={course.saleEndAt}
        saleLabel={priceResult.saleLabel}
        countdownTarget={priceResult.countdownTarget}
        saleCycleEnabled={course.saleCycleEnabled}
        saleCycleDays={course.saleCycleDays}
        showCountdown={course.showCountdown}
        shouldAutoEnroll={shouldAutoEnroll}
      />
    </div>
  );
}
