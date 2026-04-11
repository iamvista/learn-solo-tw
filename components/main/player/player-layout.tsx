// components/main/player/player-layout.tsx
// 播放器整體佈局元件
// 整合影片播放器、操作列、內容區和側邊欄

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { VideoPlayer, type VideoPlayerHandle } from "./video-player";
import type { VideoWatermarkPayload } from "@/lib/video-watermark";
import { ActionBar } from "./action-bar";
import { LessonContent } from "./lesson-content";
import { ChapterSidebar } from "./chapter-sidebar";
import { FloatingLessonMenu } from "./floating-lesson-menu";
import { LessonCompleteModal } from "./lesson-complete-modal";
import { ComingSoonModal } from "./coming-soon-modal";
import { CurriculumList } from "./curriculum-list";
import { LessonCommentsPopover } from "./lesson-comments-popover";
import {
  List,
  ArrowUp,
  Clock,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import type {
  LessonContent as LessonContentType,
  AdjacentLessons,
  CourseCurriculumForPlayer,
} from "@/lib/actions/lesson";
import type { CourseProgressStats } from "@/lib/validations/progress";

interface PlayerLayoutProps {
  lesson: LessonContentType;
  adjacentLessons: AdjacentLessons;
  curriculum: CourseCurriculumForPlayer;
  completedLessons: string[];
  courseSlug: string;
  courseProgress?: CourseProgressStats;
  watermark?: VideoWatermarkPayload;
}

export function PlayerLayout({
  lesson,
  adjacentLessons,
  curriculum,
  completedLessons: initialCompletedLessons,
  courseSlug,
  courseProgress: initialCourseProgress,
  watermark,
}: PlayerLayoutProps) {
  // 側邊欄開關狀態（手機版 Sheet）
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 桌面版 inline sidebar 收起/展開
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  // 已完成單元列表（本地狀態，用於即時更新 UI）
  const [completedLessons, setCompletedLessons] = useState<string[]>(
    initialCompletedLessons
  );

  // 課程進度統計（本地狀態）
  const [courseProgress, setCourseProgress] = useState<
    CourseProgressStats | undefined
  >(initialCourseProgress);

  // 迷你播放器狀態
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);

  const router = useRouter();

  // 檢查是否為製作中單元
  const isComingSoon = lesson.status === "COMING_SOON";

  /**
   * 處理單元完成事件（由影片播放完成觸發）
   */
  const handleVideoComplete = useCallback(() => {
    // 更新本地狀態
    if (!completedLessons.includes(lesson.id)) {
      setCompletedLessons((prev) => [...prev, lesson.id]);

      // 更新課程進度統計
      if (courseProgress) {
        const newCompletedCount = courseProgress.completedLessons + 1;
        const newPercentage = Math.round(
          (newCompletedCount / courseProgress.totalLessons) * 100
        );
        setCourseProgress({
          ...courseProgress,
          completedLessons: newCompletedCount,
          progressPercentage: newPercentage,
        });
      }
    }

    // 顯示完成 Modal
    setShowCompleteModal(true);

    // 刷新頁面資料以同步伺服器狀態
    router.refresh();
  }, [lesson.id, completedLessons, courseProgress, router]);

  /**
   * 處理單元完成事件（由「完成並前往下一章節」按鈕觸發）
   */
  const handleLessonComplete = useCallback(() => {
    // 更新本地狀態
    if (!completedLessons.includes(lesson.id)) {
      setCompletedLessons((prev) => [...prev, lesson.id]);

      // 更新課程進度統計
      if (courseProgress) {
        const newCompletedCount = courseProgress.completedLessons + 1;
        const newPercentage = Math.round(
          (newCompletedCount / courseProgress.totalLessons) * 100
        );
        setCourseProgress({
          ...courseProgress,
          completedLessons: newCompletedCount,
          progressPercentage: newPercentage,
        });
      }
    }

    // 刷新頁面資料以同步伺服器狀態
    router.refresh();
  }, [lesson.id, completedLessons, courseProgress, router]);

  /**
   * 處理手動切換進度完成狀態
   */
  const handleToggleComplete = useCallback(
    async (lessonId: string, completed: boolean) => {
      // 樂觀更新本地狀態
      if (completed) {
        if (!completedLessons.includes(lessonId)) {
          setCompletedLessons((prev) => [...prev, lessonId]);
          if (courseProgress) {
            const newCompletedCount = courseProgress.completedLessons + 1;
            setCourseProgress({
              ...courseProgress,
              completedLessons: newCompletedCount,
              progressPercentage: Math.round(
                (newCompletedCount / courseProgress.totalLessons) * 100
              ),
            });
          }
        }
      } else {
        setCompletedLessons((prev) => prev.filter((id) => id !== lessonId));
        if (courseProgress) {
          const newCompletedCount = Math.max(0, courseProgress.completedLessons - 1);
          setCourseProgress({
            ...courseProgress,
            completedLessons: newCompletedCount,
            progressPercentage: Math.round(
              (newCompletedCount / courseProgress.totalLessons) * 100
            ),
          });
        }
      }

      // 送出 API 請求更新伺服器狀態（使用 forceComplete 來允許取消完成）
      try {
        await fetch("/api/lesson-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId,
            watchedSec: 0,
            completed,
            forceComplete: true,
          }),
        });
        router.refresh();
      } catch (error) {
        console.error("更新進度失敗:", error);
        // 回滾本地狀態
        if (completed) {
          setCompletedLessons((prev) => prev.filter((id) => id !== lessonId));
        } else {
          setCompletedLessons((prev) => [...prev, lessonId]);
        }
      }
    },
    [completedLessons, courseProgress, router]
  );

  // 監聽影片區塊是否離開視窗 (用於 PiP)
  const lastVideoContainerScrollY = useRef(0);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // 在桌面版且影片離開視窗時顯示迷你播放器
        if (Math.trunc(lastVideoContainerScrollY.current) === Math.trunc(window.scrollY)) {
          return;
        }
        if (window.innerWidth >= 768) {
          setShowMiniPlayer(!entry.isIntersecting);
        }
        lastVideoContainerScrollY.current = Math.trunc(window.scrollY);
      },
      {
        threshold: 0,
      }
    );

    if (videoContainerRef.current) {
      observer.observe(videoContainerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // 監聽捲動狀態 (用於 Back to Top)
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 回到頂部
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * 處理時間戳點擊事件，跳轉影片到指定秒數
   */
  const handleTimestampClick = useCallback((seconds: number) => {
    videoPlayerRef.current?.seekTo(seconds);
  }, []);

  return (
    <div className="flex min-h-screen bg-white">
      {/* 桌面版全高 Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-gray-100 bg-white shrink-0",
          "sticky top-0 h-screen",
          "transition-[width] duration-300 ease-in-out overflow-hidden",
          desktopSidebarCollapsed ? "w-0" : "w-[380px] lg:w-[420px]"
        )}
      >
        <div
          className={cn(
            "flex flex-col h-full min-w-[380px] lg:min-w-[420px]",
            "transition-opacity duration-200",
            desktopSidebarCollapsed ? "opacity-0" : "opacity-100"
          )}
        >
          {/* Sidebar Header */}
          <div className="border-b border-gray-50 p-6 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[#0A0A0A] flex-1 truncate">
                {curriculum.title}
              </h2>
              <button
                onClick={() => setDesktopSidebarCollapsed(true)}
                className="ml-2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="收起課程列表"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </div>

            {courseProgress && courseProgress.totalLessons > 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">目前學習進度</span>
                  <span className="flex items-center gap-1.5 font-bold text-[#C41E3A]">
                    <CheckCircle2 className="h-4 w-4" />
                    {courseProgress.completedLessons} / {courseProgress.totalLessons}
                  </span>
                </div>
                <Progress
                  value={courseProgress.progressPercentage}
                  className="h-2 bg-gray-50 [&>div]:bg-[#C41E3A]"
                />
              </div>
            )}
          </div>

          {/* Curriculum List */}
          <div className="flex-1 overflow-hidden">
            <CurriculumList
              curriculum={curriculum}
              currentLessonId={lesson.id}
              completedLessons={completedLessons}
              courseSlug={courseSlug}
              courseProgress={courseProgress}
              onToggleComplete={handleToggleComplete}
            />
          </div>
        </div>
      </aside>

      {/* 桌面版收起時的貼邊展開按鈕 */}
      <AnimatePresence>
        {desktopSidebarCollapsed && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDesktopSidebarCollapsed(false)}
            className="hidden md:flex fixed top-32 left-0 z-50 items-center justify-center h-10 w-10 rounded-r-xl bg-white shadow-lg border border-l-0 border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="展開課程列表"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 右側主內容區域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Cinema Stage - 影片播放區域 */}
        <section
          ref={videoContainerRef}
          className={cn(
            "relative w-full bg-[#0A0A0A]",
            "sticky top-0 z-40 md:relative md:top-auto md:z-10"
          )}
        >
          <div
            className={cn(
              showMiniPlayer && !isComingSoon
                ? "fixed bottom-6 left-6 w-[320px] z-50 rounded-xl overflow-hidden shadow-2xl border border-white/10 hidden md:block"
                : "relative w-full aspect-video"
            )}
          >
            {isComingSoon ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0A]">
                <Clock className="h-16 w-16 text-[#C41E3A]/60" />
                <p className="mt-4 text-lg font-medium text-white/60">
                  內容製作中
                </p>
              </div>
            ) : (
              <VideoPlayer
                ref={videoPlayerRef}
                videoId={lesson.videoId}
                title={lesson.title}
                lessonId={lesson.id}
                videoDuration={lesson.videoDuration}
                onComplete={handleVideoComplete}
                onTimeUpdate={setCurrentVideoTime}
                watermark={watermark}
              />
            )}

            {showMiniPlayer && !isComingSoon && (
              <button
                onClick={() => setShowMiniPlayer(false)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white/80 hover:bg-black/70 hover:text-white transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {showMiniPlayer && (
            <div className="hidden md:flex md:relative aspect-video w-full bg-[#0A0A0A] items-center justify-center">
              <p className="text-white/20 text-sm font-medium">
                影片正在畫中畫模式播放
              </p>
            </div>
          )}
        </section>

        {/* Action Bar */}
        <ActionBar
          currentTitle={lesson.title}
          chapterTitle={lesson.chapter.title}
          adjacentLessons={adjacentLessons}
          courseSlug={courseSlug}
        />

        {/* Content Body */}
        <section className="flex-1 bg-white overflow-x-auto">
          <LessonContent
            content={lesson.content}
            adjacentLessons={adjacentLessons}
            courseSlug={courseSlug}
            onTimestampClick={handleTimestampClick}
            onComplete={handleLessonComplete}
          />
        </section>
      </div>

      {/* 手機版 Sheet */}
      <ChapterSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        curriculum={curriculum}
        currentLessonId={lesson.id}
        completedLessons={completedLessons}
        courseSlug={courseSlug}
        courseProgress={courseProgress}
        onToggleComplete={handleToggleComplete}
      />

      {/* Floating Lesson Menu */}
      <FloatingLessonMenu
        content={lesson.content}
        open={isMenuOpen}
        onOpenChange={setIsMenuOpen}
        onTimestampClick={handleTimestampClick}
        isReadingArticle={showMiniPlayer}
        currentVideoTime={currentVideoTime}
      />

      {/* Floating Controls */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
              onClick={scrollToTop}
              className="group flex h-12 w-12 items-center justify-center rounded-xl bg-[#1A1A1A] text-white/40 shadow-2xl transition-all hover:bg-[#262626] hover:text-white border border-white/5 active:scale-95"
            >
              <ArrowUp className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>

        <div className="flex h-12 items-center gap-1.5 rounded-2xl bg-[#1A1A1A] p-1.5 shadow-2xl border border-white/5">
          {/* 手機版課程列表按鈕 */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex md:hidden items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white transition-all hover:bg-white/10"
          >
            <List className="h-4 w-4" />
            <span>課程</span>
          </button>

          {/* 文章目錄 */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition-all hover:bg-white/10",
              isMenuOpen ? "text-[#C41E3A] bg-white/5" : "text-white"
            )}
          >
            <List className="h-4 w-4" />
            <span>目錄</span>
          </button>

          {/* 評論 */}
          <LessonCommentsPopover
            open={isCommentsOpen}
            onOpenChange={setIsCommentsOpen}
            lessonId={lesson.id}
            trigger={
              <button
                className={cn(
                  "flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition-all hover:bg-white/10",
                  isCommentsOpen ? "text-[#C41E3A] bg-white/5" : "text-white"
                )}
              >
                <MessageCircle className="h-4 w-4" />
                <span>評論</span>
              </button>
            }
          />
        </div>
      </div>

      {/* 單元完成 Modal */}
      <LessonCompleteModal
        open={showCompleteModal}
        onOpenChange={setShowCompleteModal}
        adjacentLessons={adjacentLessons}
        courseSlug={courseSlug}
        courseProgress={courseProgress}
      />

      {isComingSoon && (
        <ComingSoonModal
          title={lesson.comingSoonTitle || lesson.title}
          description={lesson.comingSoonDescription}
          image={lesson.comingSoonImage}
          expectedDate={lesson.comingSoonDate}
          adjacentLessons={adjacentLessons}
          courseSlug={courseSlug}
        />
      )}
    </div>
  );
}
