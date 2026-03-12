// components/admin/ai-course/ai-course-dialog.tsx
// AI 快速建立課程主 Modal

'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  FolderOpen,
  Eye,
  Play,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { FolderDropZone } from './folder-drop-zone'
import { StructurePreview } from './structure-preview'
import { ProcessingPanel } from './processing-panel'
import { LessonPreviewCard } from './lesson-preview-card'
import { useCourseProcessor } from './hooks/use-course-processor'
import { createBulkCurriculum } from '@/lib/actions/ai-course'
import type { ParsedChapter, ModalStage } from './types'

interface AICourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  onSuccess?: () => void
}

export function AICourseDialog({
  open,
  onOpenChange,
  courseId,
  onSuccess,
}: AICourseDialogProps) {
  // 階段管理
  const [stage, setStage] = useState<ModalStage>('drop')
  const [chapters, setChapters] = useState<ParsedChapter[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // 處理 Hook
  const {
    states,
    stats,
    isProcessing,
    startProcessing,
    retryLesson,
    updateLessonContent,
    updateLessonTitle,
  } = useCourseProcessor()

  // 重設狀態
  const resetState = useCallback(() => {
    setStage('drop')
    setChapters([])
  }, [])

  // 關閉 Dialog
  const handleClose = useCallback(() => {
    if (isProcessing) {
      toast.error('處理中，請稍候再關閉')
      return
    }
    resetState()
    onOpenChange(false)
  }, [isProcessing, onOpenChange, resetState])

  // 資料夾解析完成
  const handleFolderParsed = useCallback((parsedChapters: ParsedChapter[]) => {
    if (parsedChapters.length === 0) {
      toast.error('未找到有效的課程資料夾')
      return
    }
    setChapters(parsedChapters)
    setStage('preview')
  }, [])

  // 開始處理
  const handleStartProcessing = useCallback(async () => {
    setStage('processing')
    await startProcessing(chapters)
    setStage('confirm')
  }, [chapters, startProcessing])

  // 寫入資料庫
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      // 組裝資料
      const data = {
        courseId,
        chapters: chapters.map((chapter) => ({
          title: chapter.title,
          lessons: chapter.lessons.map((lesson) => {
            const state = states.get(lesson.id)
            // 組合標題：原始編號 + AI 生成標題
            const finalTitle = state?.generatedTitle
              ? `${lesson.title} ${state.generatedTitle}`
              : lesson.title

            return {
              title: finalTitle,
              content: state?.generatedContent || '',
              videoId: state?.videoId || null,
              videoDuration: state?.videoDuration || null,
            }
          }),
        })),
      }

      const result = await createBulkCurriculum(data)

      if (result.success) {
        toast.success(
          `成功建立 ${result.createdChapters} 個章節、${result.createdLessons} 個單元`
        )
        handleClose()
        onSuccess?.()
      } else {
        toast.error(result.error || '建立失敗')
      }
    } catch (error) {
      console.error('儲存失敗:', error)
      toast.error('儲存時發生錯誤')
    } finally {
      setIsSaving(false)
    }
  }, [courseId, chapters, states, handleClose, onSuccess])

  // 渲染階段內容
  const renderStageContent = () => {
    switch (stage) {
      case 'drop':
        return <FolderDropZone onFolderParsed={handleFolderParsed} />

      case 'preview':
        return (
          <StructurePreview
            chapters={chapters}
            onChaptersChange={setChapters}
          />
        )

      case 'processing':
        return (
          <ProcessingPanel
            chapters={chapters}
            states={states}
            stats={stats}
            isProcessing={isProcessing}
            onRetry={retryLesson}
          />
        )

      case 'confirm':
        return (
          <div className="space-y-4">
            {/* 統計資訊 */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">處理完成</span>
              </div>
              <p className="mt-1 text-sm text-green-600">
                成功處理 {stats.completed} 個單元
                {stats.failed > 0 && `，${stats.failed} 個失敗`}
              </p>
            </div>

            {/* 單元預覽列表 */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {chapters.map((chapter) => (
                  <div key={chapter.chapterIndex} className="space-y-2">
                    <div className="text-sm font-medium text-[#525252] sticky top-0 bg-white py-1">
                      {chapter.title}
                    </div>
                    {chapter.lessons.map((lesson) => {
                      const state = states.get(lesson.id)
                      if (!state) return null

                      return (
                        <LessonPreviewCard
                          key={lesson.id}
                          lesson={lesson}
                          state={state}
                          onContentChange={(content) =>
                            updateLessonContent(lesson.id, content)
                          }
                          onTitleChange={(title) =>
                            updateLessonTitle(lesson.id, title)
                          }
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )
    }
  }

  // 渲染按鈕
  const renderFooter = () => {
    switch (stage) {
      case 'drop':
        return (
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
        )

      case 'preview':
        return (
          <>
            <Button variant="outline" onClick={() => setStage('drop')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              重新選擇
            </Button>
            <Button
              onClick={handleStartProcessing}
              className="bg-[#C41E3A] hover:bg-[#A01830] text-white"
            >
              開始處理
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        )

      case 'processing':
        return (
          <Button variant="outline" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            處理中...
          </Button>
        )

      case 'confirm':
        return (
          <>
            <Button
              variant="outline"
              onClick={() => setStage('preview')}
              disabled={isSaving}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || stats.completed === 0}
              className="bg-[#C41E3A] hover:bg-[#A01830] text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  儲存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  確認寫入 ({stats.completed} 個單元)
                </>
              )}
            </Button>
          </>
        )
    }
  }

  // 取得階段標題和描述
  const getStageInfo = () => {
    switch (stage) {
      case 'drop':
        return {
          title: 'AI 快速建立課程',
          description: '拖入課程資料夾，系統會自動識別結構並生成內容',
          icon: FolderOpen,
        }
      case 'preview':
        return {
          title: '確認課程結構',
          description: '檢查識別的章節和單元，可以編輯標題',
          icon: Eye,
        }
      case 'processing':
        return {
          title: '處理中',
          description: '正在上傳影片並生成 AI 內容',
          icon: Play,
        }
      case 'confirm':
        return {
          title: '確認並儲存',
          description: '檢查生成的內容，確認後寫入課程',
          icon: CheckCircle,
        }
    }
  }

  const stageInfo = getStageInfo()
  const StageIcon = stageInfo.icon

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          'transition-all duration-300',
          stage === 'drop' && 'sm:max-w-lg',
          stage === 'preview' && 'sm:max-w-2xl',
          stage === 'processing' && 'sm:max-w-3xl',
          stage === 'confirm' && 'sm:max-w-4xl'
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C41E3A]/10 flex items-center justify-center">
              <StageIcon className="w-4 h-4 text-[#C41E3A]" />
            </div>
            {stageInfo.title}
          </DialogTitle>
          <DialogDescription>{stageInfo.description}</DialogDescription>
        </DialogHeader>

        {/* 階段指示器 */}
        <div className="flex items-center justify-center gap-2 py-2">
          {(['drop', 'preview', 'processing', 'confirm'] as const).map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  stage === s
                    ? 'bg-[#C41E3A]'
                    : ['drop', 'preview', 'processing', 'confirm'].indexOf(stage) > i
                      ? 'bg-green-500'
                      : 'bg-[#E5E5E5]'
                )}
              />
              {i < 3 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mx-1',
                    ['drop', 'preview', 'processing', 'confirm'].indexOf(stage) > i
                      ? 'bg-green-500'
                      : 'bg-[#E5E5E5]'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* 內容區域 */}
        <div className="min-h-[300px]">{renderStageContent()}</div>

        <DialogFooter className="gap-2">{renderFooter()}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
