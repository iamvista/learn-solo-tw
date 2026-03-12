// app/(main)/courses/[slug]/lessons/[id]/page.tsx
// 課程單元播放頁面
// Server Component - 處理權限檢查和資料取得

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getLessonContent,
  checkLessonAccess,
  getAdjacentLessons,
  getCourseCurriculumForPlayer,
  getUserCourseProgress,
} from "@/lib/actions/lesson";
import { getCourseProgress } from "@/lib/actions/progress";
import { PlayerLayout } from "@/components/main/player/player-layout";
import { JsonLd } from "@/components/common/json-ld";
import { getAppUrl } from "@/lib/app-url";
import { getPublicSiteSettings } from "@/lib/site-settings-public";

// 強制動態渲染
export const dynamic = "force-dynamic";

interface LessonPageProps {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}

// 動態產生 Metadata
export async function generateMetadata({
  params,
}: LessonPageProps): Promise<Metadata> {
  const { id } = await params;
  const lesson = await getLessonContent(id);

  if (!lesson) {
    return {
      title: "找不到單元",
    };
  }

  return {
    title: `${lesson.title} | ${lesson.chapter.course.title}`,
    description: `${lesson.chapter.course.title} - ${lesson.chapter.title} - ${lesson.title}`,
  };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug, id } = await params;

  // 取得單元內容
  const lesson = await getLessonContent(id);

  // 單元不存在
  if (!lesson) {
    notFound();
  }

  // 確認 slug 與課程相符
  if (lesson.chapter.course.slug !== slug) {
    notFound();
  }

  // 檢查存取權限
  const accessStatus = await checkLessonAccess(id);

  switch (accessStatus) {
    case "not_found":
      notFound();
      break;

    case "not_logged_in":
      // 未登入，重導向到登入頁
      redirect(`/auth/signin?callbackUrl=/courses/${slug}/lessons/${id}`);
      break;

    case "not_purchased":
      // 未購買，重導向到課程銷售頁
      redirect(`/courses/${slug}`);
      break;

    case "free":
    case "granted":
      // 有權限，繼續顯示
      break;
  }

  // 取得相鄰單元、課程大綱、已完成單元和課程進度
  const [adjacentLessons, curriculum, completedLessons, courseProgress] =
    await Promise.all([
      getAdjacentLessons(id),
      getCourseCurriculumForPlayer(lesson.chapter.course.id),
      getUserCourseProgress(lesson.chapter.course.id),
      getCourseProgress(lesson.chapter.course.id),
    ]);

  // 課程大綱應該存在
  if (!curriculum) {
    notFound();
  }

  // JSON-LD 結構化資料
  const baseUrl = getAppUrl();
  const { siteName } = await getPublicSiteSettings();
  const courseTitle = lesson.chapter.course.title;

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
      {
        "@type": "ListItem",
        position: 3,
        name: courseTitle,
        item: `${baseUrl}/courses/${slug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: lesson.title,
        item: `${baseUrl}/courses/${slug}/lessons/${id}`,
      },
    ],
  };

  // VideoObject：僅在有 Cloudflare Stream 影片時產生
  const videoJsonLd = lesson.videoId
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: lesson.title,
        description: `${courseTitle} - ${lesson.chapter.title} - ${lesson.title}`,
        duration: lesson.videoDuration
          ? `PT${lesson.videoDuration}S`
          : undefined,
        contentUrl: `${baseUrl}/courses/${slug}/lessons/${id}`,
        thumbnailUrl: `https://customer-${process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${lesson.videoId}/thumbnails/thumbnail.jpg`,
        publisher: {
          "@type": "Organization",
          name: siteName,
          url: baseUrl,
        },
        inLanguage: "zh-TW",
      }
    : null;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      {videoJsonLd && <JsonLd data={videoJsonLd} />}
      <PlayerLayout
        lesson={lesson}
        adjacentLessons={adjacentLessons}
        curriculum={curriculum}
        completedLessons={completedLessons}
        courseSlug={slug}
        courseProgress={courseProgress}
      />
    </>
  );
}
