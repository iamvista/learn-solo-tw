// components/main/player/video-player.tsx
// 影片播放器元件
// 使用 @cloudflare/stream-react 官方套件

"use client";

import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Stream, type StreamPlayerApi } from "@cloudflare/stream-react";
import { Play, Loader2, AlertCircle } from "lucide-react";
import { useProgress } from "@/hooks/use-progress";
import { useWatchTime } from "@/hooks/use-watch-time";
import posthog from "posthog-js";
import { VideoWatermarkOverlay } from "@/components/main/player/video-watermark-overlay";
import type { VideoWatermarkPayload } from "@/lib/video-watermark";

interface VideoPlayerProps {
  videoId: string | null;
  title: string;
  lessonId: string;
  videoDuration?: number | null;
  onComplete?: () => void;
  /** 當影片時間更新時的回調 */
  onTimeUpdate?: (currentTime: number) => void;
  /** 浮水印設定（啟用時顯示防盜浮水印） */
  watermark?: VideoWatermarkPayload;
}

/**
 * VideoPlayer 對外暴露的方法
 */
export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
}

/**
 * 影片串流 API 回應格式
 */
interface StreamTokenResponse {
  success: boolean;
  signedUrl?: string;
  customerCode?: string;
  expiresIn?: number;
  error?: string;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer(
    { videoId, title, lessonId, videoDuration, onComplete, onTimeUpdate, watermark },
    ref
  ) {
    // 影片容器 ref（用於浮水印定位）
    const containerRef = useRef<HTMLDivElement>(null);
    // 簽名 URL 狀態（用於 Stream 組件的 src）
    const [streamData, setStreamData] = useState<{
      signedUrl: string;
      customerCode: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Stream player ref
    const streamRef = useRef<StreamPlayerApi>(undefined);

    // 進度追蹤 Hook
    const { updateProgress, flushProgress, markComplete } = useProgress({
      lessonId,
      videoDuration,
      debounceMs: 5000,
      completeThreshold: 90,
      onComplete: () => {
        onComplete?.();
      },
    });

    // 觀看時間追蹤 Hook
    const { reportPlaying } = useWatchTime({
      lessonId,
    });

    // 當前播放時間參考
    const currentTimeRef = useRef(0);
    const isPlayingRef = useRef(false);
    const hasTrackedPlayStartRef = useRef(false);

    /**
     * 暴露 seekTo 方法給父層使用
     */
    useImperativeHandle(
      ref,
      () => ({
        seekTo: (seconds: number) => {
          if (streamRef.current) {
            streamRef.current.currentTime = seconds;
          }
        },
      }),
      []
    );

    /**
     * 處理播放事件
     */
    const handlePlay = () => {
      isPlayingRef.current = true;
      reportPlaying(true);

      // PostHog: 影片播放開始（每個 lesson 只追蹤一次）
      if (!hasTrackedPlayStartRef.current) {
        hasTrackedPlayStartRef.current = true;
        posthog.capture("video_play_started", {
          lesson_id: lessonId,
          lesson_title: title,
          video_id: videoId,
          video_duration: videoDuration,
        });
      }
    };

    /**
     * 處理暫停事件
     */
    const handlePause = () => {
      isPlayingRef.current = false;
      reportPlaying(false);
      flushProgress();
    };

    /**
     * 處理時間更新事件
     */
    const handleTimeUpdate = () => {
      if (streamRef.current?.currentTime !== undefined) {
        currentTimeRef.current = Math.floor(streamRef.current.currentTime);
        if (isPlayingRef.current) {
          updateProgress(currentTimeRef.current);
        }
        // 通知父層當前播放時間
        onTimeUpdate?.(currentTimeRef.current);
      }
    };

    /**
     * 處理播放結束事件
     */
    const handleEnded = () => {
      isPlayingRef.current = false;
      reportPlaying(false);
      markComplete();

      // PostHog: Track lesson completion via video end
      posthog.capture("lesson_completed", {
        lesson_id: lessonId,
        lesson_title: title,
        video_duration: videoDuration,
        completion_method: "video_ended",
      });
    };

    /**
     * 組件卸載時上報最終進度
     */
    useEffect(() => {
      return () => {
        flushProgress();
      };
    }, [flushProgress]);

    /**
     * 當 lessonId 變更時，重置狀態
     */
    useEffect(() => {
      isPlayingRef.current = false;
      currentTimeRef.current = 0;
      hasTrackedPlayStartRef.current = false;
    }, [lessonId]);

    /**
     * 取得簽名 URL
     */
    useEffect(() => {
      // 重置狀態
      setStreamData(null);
      setError(null);

      // 如果沒有 videoId，不需要取得簽名 URL
      if (!videoId) {
        return;
      }

      const fetchSignedUrl = async () => {
        setIsLoading(true);
        setError(null);

        try {
          const response = await fetch("/api/lesson/stream-url", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              lessonId,
              videoId,
            }),
          });

          const data: StreamTokenResponse = await response.json();

          if (!data.success) {
            const errorMessage = data.error || "無法取得影片串流 URL";
            setError(errorMessage);

            // PostHog: Track video playback error
            posthog.capture("video_playback_error", {
              lesson_id: lessonId,
              lesson_title: title,
              video_id: videoId,
              error_message: errorMessage,
              error_type: "stream_url_fetch_failed",
            });
            return;
          }

          if (data.signedUrl && data.customerCode) {
            setStreamData({
              signedUrl: data.signedUrl,
              customerCode: data.customerCode,
            });
          }
        } catch (err) {
          console.error("取得影片串流 URL 失敗:", err);
          const errorMessage = "取得影片串流 URL 時發生錯誤";
          setError(errorMessage);

          // PostHog: Track video playback error and capture exception
          posthog.capture("video_playback_error", {
            lesson_id: lessonId,
            lesson_title: title,
            video_id: videoId,
            error_message: errorMessage,
            error_type: "network_error",
          });
          posthog.captureException(err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchSignedUrl();
    }, [lessonId, videoId]);

    // 如果沒有影片 ID，顯示佔位
    if (!videoId) {
      return (
        <div className="relative flex h-full w-full items-center justify-center bg-[#FAFAFA]">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm border border-[#E5E5E5]">
              <Play className="h-8 w-8 text-[#A3A3A3]" />
            </div>
            <div className="max-w-md px-4">
              <h3 className="text-lg font-bold text-[#0A0A0A]">{title}</h3>
              <p className="mt-2 text-sm text-[#A3A3A3]">此單元尚無影片內容</p>
            </div>
          </div>
        </div>
      );
    }

    // 載入中狀態
    if (isLoading) {
      return (
        <div className="relative flex h-full w-full items-center justify-center bg-[#FAFAFA]">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#C41E3A]" />
            <p className="text-sm text-[#525252]">正在載入影片...</p>
          </div>
        </div>
      );
    }

    // 錯誤狀態
    if (error) {
      return (
        <div className="relative flex h-full w-full items-center justify-center bg-[#FAFAFA]">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <div className="max-w-md px-4">
              <h3 className="text-lg font-bold text-[#0A0A0A]">{title}</h3>
              <p className="mt-2 text-sm text-red-500">{error}</p>
            </div>
          </div>
        </div>
      );
    }

    // 等待取得 streamData
    if (!streamData) {
      return (
        <div className="relative flex h-full w-full items-center justify-center bg-[#FAFAFA]">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#C41E3A]" />
            <p className="text-sm text-[#525252]">正在準備影片...</p>
          </div>
        </div>
      );
    }

    return (
      <div ref={containerRef} className="relative bg-black aspect-video">
        <Stream
          height="100%"
          src={streamData.signedUrl}
          customerCode={streamData.customerCode}
          streamRef={streamRef}
          controls
          responsive
          onPlay={handlePlay}
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
        {watermark?.enabled && (
          <VideoWatermarkOverlay
            watermark={watermark}
            containerRef={containerRef}
            onTamper={() => {
              // 暫停影片播放
              if (streamRef.current) {
                streamRef.current.pause();
              }
            }}
          />
        )}
      </div>
    );
  }
);
