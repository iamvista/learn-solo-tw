// components/admin/course-editor/lesson-editor-panel.tsx
// 課程內容頁面的中間單元編輯器面板
// 影片設定 + Markdown 內容編輯

'use client'

import { useState, useEffect, useCallback, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import type { Media } from '@prisma/client'
import { useCourseEditor } from '@/lib/contexts/course-editor-context'
import { updateLesson } from '@/lib/actions/curriculum'
import { getMediaById, getMediaByCfStreamId } from '@/lib/actions/media'
import { MilkdownMarkdownEditor } from '@/components/admin/curriculum/milkdown-editor'
import { MediaPicker } from '@/components/admin/media/media-picker'
import { VideoUpload } from '@/components/admin/media/video-upload'
import { Button } from '@/components/ui/button'
import {
  Video,
  Upload,
  FolderOpen,
  Play,
  Trash2,
  FileText,
  Loader2,
  Save,
} from 'lucide-react'

// ==================== Empty State ====================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-20 h-20 rounded-full bg-[#FAFAFA] flex items-center justify-center mb-6">
        <FileText className="h-10 w-10 text-[#D4D4D4]" />
      </div>
      <h3 className="text-lg font-medium text-[#0A0A0A] mb-2">尚無選取單元</h3>
      <p className="text-sm text-[#525252] max-w-sm">
        從左側大綱中選擇一個單元來開始編輯，或新增一個章節和單元
      </p>
    </div>
  )
}

// ==================== Video Section ====================

interface VideoSectionProps {
  videoId: string | null
  videoDuration: number | null
  onVideoChange: (videoId: string | null, duration: number | null) => void
  streamCustomerCode?: string
}

function VideoSection({
  videoId,
  videoDuration,
  onVideoChange,
  streamCustomerCode,
}: VideoSectionProps) {
  const [showUploader, setShowUploader] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [isPollingDuration, setIsPollingDuration] = useState(false)
  const pollAbortRef = useRef(false)
  const isPollingRef = useRef(false)
  const onVideoChangeRef = useRef(onVideoChange)
  onVideoChangeRef.current = onVideoChange

  // 根據 cfStreamId 查詢對應的 mediaId（用於輪詢 API）
  const mediaIdRef = useRef<string | null>(null)

  // 自動檢測：有 videoId 但沒有有效 videoDuration 時，自動啟動輪詢
  useEffect(() => {
    if (!videoId || (videoDuration && videoDuration > 0) || isPollingRef.current) return

    const startPolling = async () => {
      // 如果已有 mediaId，直接開始
      if (mediaIdRef.current) {
        pollForDuration(mediaIdRef.current, videoId)
        return
      }
      // 否則根據 cfStreamId 查找 mediaId
      try {
        const media = await getMediaByCfStreamId(videoId)
        if (media) {
          mediaIdRef.current = media.id
          // 如果找到時已有 duration，直接更新
          if (media.duration && media.duration > 0) {
            onVideoChangeRef.current(videoId, media.duration)
          } else {
            pollForDuration(media.id, videoId)
          }
        }
      } catch {
        // 查找失敗，靜默處理
      }
    }

    startPolling()
  }, [videoId, videoDuration]) // eslint-disable-line react-hooks/exhaustive-deps

  // 清理輪詢
  useEffect(() => {
    return () => {
      pollAbortRef.current = true
    }
  }, [])

  // 處理從媒體庫選擇
  const handleSelectFromLibrary = (media: Media) => {
    if (media.cfStreamId) {
      mediaIdRef.current = media.id
      onVideoChange(media.cfStreamId, media.duration ?? null)

      // 如果影片還沒有 duration（仍在處理中），啟動輪詢
      if (!media.duration) {
        pollForDuration(media.id, media.cfStreamId)
      }
    }
  }

  // 輪詢取得影片時長
  const pollForDuration = async (mediaId: string, cfStreamId: string) => {
    if (isPollingRef.current) return // 避免重複輪詢
    const maxAttempts = 60
    const interval = 3000

    isPollingRef.current = true
    pollAbortRef.current = false
    setIsPollingDuration(true)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (pollAbortRef.current) break
      try {
        const response = await fetch(`/api/admin/media/${mediaId}/status`)
        const data = await response.json()

        if (data.success && data.media?.duration && data.media.duration > 0) {
          onVideoChangeRef.current(cfStreamId, data.media.duration)
          setIsPollingDuration(false)
          isPollingRef.current = false
          return
        }

        await new Promise((resolve) => setTimeout(resolve, interval))
      } catch (error) {
        console.error('輪詢影片狀態失敗:', error)
        break
      }
    }

    setIsPollingDuration(false)
    isPollingRef.current = false
  }

  // 處理上傳完成
  const handleUploadComplete = async (uploadResult: {
    id: string
    uid: string
    originalName: string
  }) => {
    // 從資料庫取得完整的媒體資訊
    const media = await getMediaById(uploadResult.id)
    if (media?.cfStreamId) {
      mediaIdRef.current = media.id
      // 先設定 videoId，duration 可能還沒準備好
      onVideoChange(media.cfStreamId, media.duration ?? null)

      // 如果沒有 duration，啟動輪詢
      if (!media.duration) {
        pollForDuration(media.id, media.cfStreamId)
      }
    }
    setShowUploader(false)
  }

  // 移除影片
  const handleRemoveVideo = () => {
    onVideoChange(null, null)
  }

  // 格式化時長
  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds === undefined || seconds <= 0) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#0A0A0A]">影片設定</h3>
        {videoId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveVideo}
            className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            移除影片
          </Button>
        )}
      </div>

      {/* 已有影片 - 顯示預覽 */}
      {videoId ? (
        <div className="space-y-3">
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
            {isPollingDuration || (!videoDuration || videoDuration <= 0) ? (
              /* 影片處理中或時長未知 - 顯示處理中狀態而非 iframe（避免 Video Not Found） */
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0A]">
                <Loader2 className="h-10 w-10 text-[#F5A524] animate-spin mb-3" />
                <p className="text-white text-sm">影片處理中，請稍候...</p>
                <p className="text-[#A3A3A3] text-xs mt-1">處理完成後將自動顯示預覽</p>
              </div>
            ) : (
              <iframe
                src={`https://customer-${streamCustomerCode || process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${videoId}/iframe`}
                className="w-full h-full"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-[#525252]">
            <div className="flex items-center gap-1">
              <Video className="h-3 w-3" />
              <span>Video ID: {videoId.slice(0, 8)}...</span>
            </div>
            {formatDuration(videoDuration) ? (
              <div className="flex items-center gap-1">
                <Play className="h-3 w-3" />
                <span>時長: {formatDuration(videoDuration)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[#F5A524]">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>影片處理中...</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 無影片 - 顯示按鈕或上傳區 */}
          {showUploader ? (
            <div className="space-y-3">
              <VideoUpload
                onUploadComplete={handleUploadComplete}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUploader(false)}
                className="text-xs text-[#525252]"
              >
                取消上傳
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowUploader(true)}
                className="flex-1 h-20 flex-col gap-2 border-dashed border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] hover:border-[#F5A524]"
              >
                <Upload className="h-5 w-5" />
                <span className="text-xs">上傳影片</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPicker(true)}
                className="flex-1 h-20 flex-col gap-2 border-dashed border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] hover:border-[#F5A524]"
              >
                <FolderOpen className="h-5 w-5" />
                <span className="text-xs">從媒體庫選擇</span>
              </Button>
            </div>
          )}
        </>
      )}

      {/* 媒體選擇器 */}
      <MediaPicker
        open={showPicker}
        onOpenChange={setShowPicker}
        onSelect={handleSelectFromLibrary}
        type="VIDEO"
        title="選擇影片"
        description="從媒體庫中選擇一個影片"
        streamCustomerCode={streamCustomerCode}
      />
    </div>
  )
}

// ==================== 主元件 ====================

interface LessonEditorPanelProps {
  streamCustomerCode?: string
}

export function LessonEditorPanel({ streamCustomerCode }: LessonEditorPanelProps) {
  const { selectedLesson, selectedLessonId, updateLessonInCurriculum, setIsDirty } =
    useCourseEditor()
  const [isPending, startTransition] = useTransition()

  // 本地表單狀態
  const [videoId, setVideoId] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [content, setContent] = useState('')

  // 追蹤上一次的 lesson ID，只在切換單元時重置表單
  const prevLessonIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (selectedLessonId !== prevLessonIdRef.current) {
      prevLessonIdRef.current = selectedLessonId
      if (selectedLesson) {
        setVideoId(selectedLesson.videoId)
        setVideoDuration(selectedLesson.videoDuration)
        setContent(selectedLesson.content ?? '')
      } else {
        setVideoId(null)
        setVideoDuration(null)
        setContent('')
      }
    }
  }, [selectedLessonId, selectedLesson])

  // 保存當前 lessonId 的 ref，供 handleVideoChange 使用（避免 stale closure）
  const selectedLessonIdRef = useRef<string | null>(null)
  selectedLessonIdRef.current = selectedLessonId

  // 處理影片變更
  const handleVideoChange = useCallback(
    (newVideoId: string | null, newDuration: number | null) => {
      setVideoId(newVideoId)
      setVideoDuration(newDuration)
      setIsDirty(true)

      // 即時更新 curriculum context（樂觀更新）
      const lessonId = selectedLessonIdRef.current
      if (lessonId) {
        updateLessonInCurriculum(lessonId, {
          videoId: newVideoId,
          videoDuration: newDuration,
        })
      }
    },
    [setIsDirty, updateLessonInCurriculum]
  )

  // 處理內容變更
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent)
      setIsDirty(true)
    },
    [setIsDirty]
  )

  // 儲存變更
  const handleSave = useCallback(() => {
    if (!selectedLesson) return

    startTransition(async () => {
      // 確保 videoDuration 是有效正整數或 undefined（讓 Zod 接受）
      const safeDuration =
        videoDuration && videoDuration > 0 ? videoDuration : undefined

      const result = await updateLesson(selectedLesson.id, {
        title: selectedLesson.title,
        videoId: videoId ?? undefined,
        videoDuration: safeDuration,
        content: content || undefined,
        isFree: selectedLesson.isFree,
        status: selectedLesson.status as 'PUBLISHED' | 'COMING_SOON',
        comingSoonTitle: selectedLesson.comingSoonTitle ?? undefined,
        comingSoonDescription: selectedLesson.comingSoonDescription ?? undefined,
        comingSoonImage: selectedLesson.comingSoonImage ?? undefined,
        comingSoonDate: selectedLesson.comingSoonDate ?? undefined,
      })

      if (result.success && result.lesson) {
        updateLessonInCurriculum(selectedLesson.id, {
          videoId: result.lesson.videoId,
          videoDuration: result.lesson.videoDuration,
          content: result.lesson.content,
        })
        setIsDirty(false)
        toast.success('單元已儲存')
      } else {
        toast.error(result.error ?? '儲存失敗')
      }
    })
  }, [
    selectedLesson,
    videoId,
    videoDuration,
    content,
    updateLessonInCurriculum,
    setIsDirty,
  ])

  // Empty State
  if (!selectedLesson) {
    return <EmptyState />
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-white">
        <div>
          <h2 className="text-lg font-medium text-[#0A0A0A]">
            {selectedLesson.title}
          </h2>
          <p className="text-xs text-[#A3A3A3] mt-0.5">
            編輯單元內容
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="bg-[#F5A524] hover:bg-[#E09000] text-white"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          儲存變更
        </Button>
      </div>

      {/* 內容區域 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* 影片設定 */}
        <VideoSection
          videoId={videoId}
          videoDuration={videoDuration}
          onVideoChange={handleVideoChange}
          streamCustomerCode={streamCustomerCode}
        />

        {/* 分隔線 */}
        <div className="border-t border-[#E5E5E5]" />

        {/* 單元內容 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-[#0A0A0A]">單元內容</h3>
          <MilkdownMarkdownEditor
            value={content}
            onChange={handleContentChange}
            placeholder="輸入單元內容..."
            editorKey={selectedLesson.id}
          />
        </div>
      </div>
    </div>
  )
}
