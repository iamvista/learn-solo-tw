// components/admin/media/media-picker.tsx
// 媒體選擇器元件
// 對話框形式，可選擇影片或圖片

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VideoCard } from './video-card'
import { ImageCard } from './image-card'
import { VideoUpload } from './video-upload'
import { ImageUpload } from './image-upload'
import { Search, Film, Image as ImageIcon, Upload, Loader2 } from 'lucide-react'
import { getMediaList, type GetMediaResult } from '@/lib/actions/media'
import type { Media, MediaType } from '@prisma/client'

interface MediaPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (media: Media) => void
  type?: 'VIDEO' | 'IMAGE' | 'ALL'
  title?: string
  description?: string
  streamCustomerCode?: string
}

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  type = 'ALL',
  title = '選擇媒體',
  description = '從媒體庫中選擇或上傳新的媒體檔案',
  streamCustomerCode,
}: MediaPickerProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library')
  const [mediaType, setMediaType] = useState<'VIDEO' | 'IMAGE'>(
    type === 'IMAGE' ? 'IMAGE' : 'VIDEO'
  )
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mediaData, setMediaData] = useState<GetMediaResult | null>(null)
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)

  // 載入媒體列表
  const loadMedia = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getMediaList({
        type: mediaType,
        search: search || undefined,
        pageSize: 20,
      })
      setMediaData(result)
    } catch (error) {
      console.error('載入媒體列表失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }, [mediaType, search])

  // 當對話框開啟或類型變更時載入媒體
  useEffect(() => {
    if (open) {
      loadMedia()
      setSelectedMedia(null)
    }
  }, [open, mediaType, loadMedia])

  // 搜尋防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        loadMedia()
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search, open, loadMedia])

  // 處理選擇
  const handleSelect = (media: Media) => {
    setSelectedMedia(media)
  }

  // 確認選擇
  const handleConfirm = () => {
    if (selectedMedia) {
      onSelect(selectedMedia)
      onOpenChange(false)
    }
  }

  // 上傳完成後重新載入
  const handleUploadComplete = () => {
    setActiveTab('library')
    loadMedia()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[#E5E5E5] max-w-4xl max-h-[90vh] flex flex-col rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-[#0A0A0A]">{title}</DialogTitle>
          <DialogDescription className="text-[#525252]">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* 標籤頁 */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'library' | 'upload')}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="bg-[#FAFAFA] border-[#E5E5E5]">
            <TabsTrigger value="library" className="data-[state=active]:bg-white data-[state=active]:text-[#0A0A0A] text-[#525252]">
              媒體庫
            </TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-white data-[state=active]:text-[#0A0A0A] text-[#525252]">
              <Upload className="w-4 h-4 mr-2" />
              上傳新檔案
            </TabsTrigger>
          </TabsList>

          {/* 媒體庫 */}
          <TabsContent value="library" className="flex-1 overflow-hidden flex flex-col mt-4">
            {/* 搜尋和類型切換 */}
            <div className="flex items-center gap-4 mb-4">
              {/* 類型切換 */}
              {type === 'ALL' && (
                <div className="flex items-center gap-2 bg-[#FAFAFA] p-1 rounded-lg">
                  <Button
                    variant={mediaType === 'VIDEO' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setMediaType('VIDEO')}
                    className={mediaType === 'VIDEO' ? 'bg-[#F5A524] hover:bg-[#E09000] text-white' : 'text-[#525252] hover:text-[#0A0A0A] hover:bg-white'}
                  >
                    <Film className="w-4 h-4 mr-2" />
                    影片
                  </Button>
                  <Button
                    variant={mediaType === 'IMAGE' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setMediaType('IMAGE')}
                    className={mediaType === 'IMAGE' ? 'bg-[#F5A524] hover:bg-[#E09000] text-white' : 'text-[#525252] hover:text-[#0A0A0A] hover:bg-white'}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    圖片
                  </Button>
                </div>
              )}

              {/* 搜尋 */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
                <Input
                  placeholder="搜尋媒體..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#F5A524] focus:ring-[#F5A524]"
                />
              </div>
            </div>

            {/* 媒體列表 */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#A3A3A3]" />
                </div>
              ) : mediaData?.media.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  {mediaType === 'VIDEO' ? (
                    <Film className="w-12 h-12 text-[#A3A3A3] mb-4" />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-[#A3A3A3] mb-4" />
                  )}
                  <p className="text-[#525252]">
                    {search ? '沒有找到符合的媒體' : '還沒有上傳任何媒體'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
                    onClick={() => setActiveTab('upload')}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    上傳新檔案
                  </Button>
                </div>
              ) : (
                <div
                  className={
                    mediaType === 'VIDEO'
                      ? 'grid grid-cols-2 md:grid-cols-3 gap-4'
                      : 'grid grid-cols-3 md:grid-cols-4 gap-4'
                  }
                >
                  {mediaData?.media.map((media) =>
                    mediaType === 'VIDEO' ? (
                      <VideoCard
                        key={media.id}
                        video={media}
                        selectable
                        selected={selectedMedia?.id === media.id}
                        onSelect={handleSelect}
                        streamCustomerCode={streamCustomerCode}
                      />
                    ) : (
                      <ImageCard
                        key={media.id}
                        image={media}
                        selectable
                        selected={selectedMedia?.id === media.id}
                        onSelect={handleSelect}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* 上傳 */}
          <TabsContent value="upload" className="flex-1 overflow-y-auto mt-4">
            {mediaType === 'VIDEO' || type === 'VIDEO' ? (
              <VideoUpload
                onUploadComplete={handleUploadComplete}
              />
            ) : (
              <ImageUpload
                onUploadComplete={handleUploadComplete}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* 底部按鈕 */}
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg">
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedMedia}
            className="bg-[#F5A524] hover:bg-[#E09000] text-white rounded-lg"
          >
            確認選擇
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
