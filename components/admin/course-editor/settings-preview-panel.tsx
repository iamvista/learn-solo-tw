// components/admin/course-editor/settings-preview-panel.tsx
// 課程內容頁面的右側設定與預覽面板
// Tab 切換：編輯設定 / 預覽模式

'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { toast } from 'sonner'
import Image from 'next/image'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Streamdown } from 'streamdown'
import type { Media } from '@prisma/client'
import { useCourseEditor } from '@/lib/contexts/course-editor-context'
import { updateLesson } from '@/lib/actions/curriculum'
import { MediaPicker } from '@/components/admin/media/media-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  Settings,
  Eye,
  FileText,
  CalendarIcon,
  Image as ImageIcon,
  Loader2,
  Save,
  Clock,
} from 'lucide-react'

// ==================== Empty State ====================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <Settings className="h-8 w-8 text-[#D4D4D4] mb-3" />
      <p className="text-sm text-[#525252]">選擇一個單元來編輯設定</p>
    </div>
  )
}

// ==================== Preview Panel ====================

interface PreviewPanelProps {
  videoId: string | null
  content: string | null
  title: string
  streamCustomerCode?: string
}

function PreviewPanel({
  videoId,
  content,
  title,
  streamCustomerCode,
}: PreviewPanelProps) {
  return (
    <div className="h-full overflow-y-auto">
      {/* 影片預覽 */}
      <div className="aspect-video bg-black">
        {videoId ? (
          <iframe
            src={`https://customer-${streamCustomerCode || process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${videoId}/iframe`}
            className="w-full h-full"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white/60">
              <FileText className="h-10 w-10 mx-auto mb-2" />
              <p className="text-sm">尚無影片</p>
            </div>
          </div>
        )}
      </div>

      {/* 內容預覽 */}
      <div className="p-4">
        <h2 className="text-lg font-bold text-[#0A0A0A] mb-4">{title}</h2>
        {content ? (
          <div className="prose prose-sm max-w-none prose-headings:text-[#0A0A0A] prose-p:text-[#525252] prose-a:text-[#F5A524] prose-strong:text-[#0A0A0A] prose-code:text-[#F5A524] prose-code:bg-[#FAFAFA] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[#FAFAFA] prose-blockquote:border-[#E5E5E5] prose-blockquote:text-[#525252] prose-li:text-[#525252]">
            <Streamdown>{content}</Streamdown>
          </div>
        ) : (
          <p className="text-sm text-[#A3A3A3]">尚無內容</p>
        )}
      </div>
    </div>
  )
}

// ==================== Settings Panel ====================

interface SettingsPanelProps {
  streamCustomerCode?: string
}

function SettingsPanel({ streamCustomerCode }: SettingsPanelProps) {
  const { selectedLesson, updateLessonInCurriculum, setIsDirty } =
    useCourseEditor()
  const [isPending, startTransition] = useTransition()

  // 本地狀態
  const [title, setTitle] = useState('')
  const [isFree, setIsFree] = useState(false)
  const [status, setStatus] = useState<'PUBLISHED' | 'COMING_SOON'>('PUBLISHED')
  const [comingSoonTitle, setComingSoonTitle] = useState('')
  const [comingSoonDescription, setComingSoonDescription] = useState('')
  const [comingSoonImage, setComingSoonImage] = useState('')
  const [comingSoonDate, setComingSoonDate] = useState<Date | undefined>()
  const [imagePickerOpen, setImagePickerOpen] = useState(false)

  // 初始化表單
  useEffect(() => {
    if (selectedLesson) {
      setTitle(selectedLesson.title)
      setIsFree(selectedLesson.isFree)
      setStatus(
        (selectedLesson.status as 'PUBLISHED' | 'COMING_SOON') ?? 'PUBLISHED'
      )
      setComingSoonTitle(selectedLesson.comingSoonTitle ?? '')
      setComingSoonDescription(selectedLesson.comingSoonDescription ?? '')
      setComingSoonImage(selectedLesson.comingSoonImage ?? '')
      setComingSoonDate(
        selectedLesson.comingSoonDate
          ? new Date(selectedLesson.comingSoonDate)
          : undefined
      )
    }
  }, [selectedLesson])

  // 儲存設定
  const handleSave = useCallback(() => {
    if (!selectedLesson) return

    startTransition(async () => {
      const result = await updateLesson(selectedLesson.id, {
        title,
        isFree,
        status,
        comingSoonTitle: comingSoonTitle || undefined,
        comingSoonDescription: comingSoonDescription || undefined,
        comingSoonImage: comingSoonImage || undefined,
        comingSoonDate: comingSoonDate ?? undefined,
        videoId: selectedLesson.videoId ?? undefined,
        videoDuration: selectedLesson.videoDuration ?? undefined,
        content: selectedLesson.content ?? undefined,
      })

      if (result.success && result.lesson) {
        updateLessonInCurriculum(selectedLesson.id, {
          title: result.lesson.title,
          isFree: result.lesson.isFree,
          status: result.lesson.status,
          comingSoonTitle: result.lesson.comingSoonTitle,
          comingSoonDescription: result.lesson.comingSoonDescription,
          comingSoonImage: result.lesson.comingSoonImage,
          comingSoonDate: result.lesson.comingSoonDate,
        })
        setIsDirty(false)
        toast.success('設定已儲存')
      } else {
        toast.error(result.error ?? '儲存失敗')
      }
    })
  }, [
    selectedLesson,
    title,
    isFree,
    status,
    comingSoonTitle,
    comingSoonDescription,
    comingSoonImage,
    comingSoonDate,
    updateLessonInCurriculum,
    setIsDirty,
  ])

  // 處理圖片選擇
  const handleImageSelect = (media: Media) => {
    setComingSoonImage(media.url)
    setIsDirty(true)
  }

  if (!selectedLesson) {
    return <EmptyState />
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5]">
        <h3 className="text-sm font-medium text-[#0A0A0A]">單元設定</h3>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="h-7 bg-[#F5A524] hover:bg-[#E09000] text-white text-xs"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Save className="h-3 w-3 mr-1" />
          )}
          儲存
        </Button>
      </div>

      {/* 設定表單 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 標題 */}
        <div className="space-y-2">
          <Label className="text-xs text-[#525252]">單元標題</Label>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setIsDirty(true)
            }}
            placeholder="輸入單元標題"
            className="h-9 text-sm bg-white border-[#E5E5E5]"
          />
        </div>

        {/* 試閱開關 */}
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label className="text-xs text-[#0A0A0A]">免費試閱</Label>
            <p className="text-[10px] text-[#A3A3A3]">
              未購買者可觀看此單元
            </p>
          </div>
          <Switch
            checked={isFree}
            onCheckedChange={(checked) => {
              setIsFree(checked)
              setIsDirty(true)
            }}
          />
        </div>

        {/* 狀態選擇 */}
        <div className="space-y-2">
          <Label className="text-xs text-[#525252]">發布狀態</Label>
          <Select
            value={status}
            onValueChange={(value: 'PUBLISHED' | 'COMING_SOON') => {
              setStatus(value)
              setIsDirty(true)
            }}
          >
            <SelectTrigger className="h-9 text-sm bg-white border-[#E5E5E5]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-[#E5E5E5]">
              <SelectItem value="PUBLISHED">已發布</SelectItem>
              <SelectItem value="COMING_SOON">即將上線</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 即將上線設定 */}
        {status === 'COMING_SOON' && (
          <>
            <div className="border-t border-[#E5E5E5] pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-[#F5A524]" />
                <span className="text-xs font-medium text-[#0A0A0A]">
                  即將上線設定
                </span>
              </div>

              {/* 彈窗標題 */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs text-[#525252]">彈窗標題</Label>
                <Input
                  value={comingSoonTitle}
                  onChange={(e) => {
                    setComingSoonTitle(e.target.value)
                    setIsDirty(true)
                  }}
                  placeholder="即將上線"
                  className="h-9 text-sm bg-white border-[#E5E5E5]"
                />
              </div>

              {/* 彈窗描述 */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs text-[#525252]">彈窗描述</Label>
                <Textarea
                  value={comingSoonDescription}
                  onChange={(e) => {
                    setComingSoonDescription(e.target.value)
                    setIsDirty(true)
                  }}
                  placeholder="此單元正在製作中..."
                  className="text-sm bg-white border-[#E5E5E5] resize-none"
                  rows={3}
                />
              </div>

              {/* 預覽圖片 */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs text-[#525252]">預覽圖片</Label>
                {comingSoonImage ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-[#E5E5E5]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={comingSoonImage}
                      alt="Preview"
                      className="object-cover"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setImagePickerOpen(true)}
                      className="absolute bottom-2 right-2 h-7 text-xs"
                    >
                      更換圖片
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setImagePickerOpen(true)}
                    className="w-full h-16 border-dashed border-[#E5E5E5] text-[#525252]"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    選擇圖片
                  </Button>
                )}
              </div>

              {/* 預計上線日期 */}
              <div className="space-y-2">
                <Label className="text-xs text-[#525252]">預計上線日期</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-9 justify-start text-left text-sm font-normal border-[#E5E5E5]',
                        !comingSoonDate && 'text-[#A3A3A3]'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {comingSoonDate
                        ? format(comingSoonDate, 'yyyy/MM/dd', { locale: zhTW })
                        : '選擇日期'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white border-[#E5E5E5]">
                    <Calendar
                      mode="single"
                      selected={comingSoonDate}
                      onSelect={(date) => {
                        setComingSoonDate(date)
                        setIsDirty(true)
                      }}
                      locale={zhTW}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 圖片選擇器 */}
      <MediaPicker
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        onSelect={handleImageSelect}
        type="IMAGE"
        title="選擇預覽圖片"
        description="選擇一張圖片作為即將上線的預覽"
        streamCustomerCode={streamCustomerCode}
      />
    </div>
  )
}

// ==================== 主元件 ====================

interface SettingsPreviewPanelProps {
  streamCustomerCode?: string
}

export function SettingsPreviewPanel({
  streamCustomerCode,
}: SettingsPreviewPanelProps) {
  const { selectedLesson } = useCourseEditor()
  const [activeTab, setActiveTab] = useState<'settings' | 'preview'>('settings')

  if (!selectedLesson) {
    return <EmptyState />
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tab 切換 */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'settings' | 'preview')}
        className="h-full flex flex-col"
      >
        <div className="border-b border-[#E5E5E5]">
          <TabsList className="w-full h-10 bg-transparent rounded-none p-0">
            <TabsTrigger
              value="settings"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#F5A524] data-[state=active]:bg-transparent data-[state=active]:text-[#F5A524] text-[#525252]"
            >
              <Settings className="h-4 w-4 mr-1.5" />
              編輯
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#F5A524] data-[state=active]:bg-transparent data-[state=active]:text-[#F5A524] text-[#525252]"
            >
              <Eye className="h-4 w-4 mr-1.5" />
              預覽
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="settings" className="flex-1 m-0 overflow-hidden">
          <SettingsPanel streamCustomerCode={streamCustomerCode} />
        </TabsContent>

        <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
          <PreviewPanel
            videoId={selectedLesson.videoId}
            content={selectedLesson.content}
            title={selectedLesson.title}
            streamCustomerCode={streamCustomerCode}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
