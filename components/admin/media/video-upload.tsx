// components/admin/media/video-upload.tsx
// 影片上傳元件
// 支援 Direct Creator Upload (小檔案) 和 TUS 協議 (大檔案)

'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, X, Film, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  uploadVideo,
  formatFileSize,
  parseCloudflareError,
} from '@/lib/utils/video-uploader'

interface VideoUploadProps {
  onUploadComplete?: (media: {
    id: string
    uid: string
    originalName: string
  }) => void
  onError?: (error: string) => void
  className?: string
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  uid?: string
  mediaId?: string
}

export function VideoUpload({
  onUploadComplete,
  onError,
  className,
}: VideoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 處理拖放
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('video/')
    )

    if (files.length > 0) {
      handleUpload(files)
    }
  }, [])

  // 處理檔案選擇
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : []
      if (files.length > 0) {
        handleUpload(files)
      }
      // 清空 input 以便再次選擇相同檔案
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    []
  )

  // 上傳單一檔案
  const uploadSingleFile = async (file: File, uploadId: string) => {
    try {
      const result = await uploadVideo(file, (progress) => {
        setUploadingFiles((prev) =>
          prev.map((item) =>
            item.id === uploadId ? { ...item, progress } : item
          )
        )
      })

      // 上傳成功
      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.id === uploadId
            ? {
                ...item,
                status: 'completed',
                progress: 100,
                uid: result.uid,
                mediaId: result.mediaId,
              }
            : item
        )
      )

      onUploadComplete?.({
        id: result.mediaId || result.uid,
        uid: result.uid,
        originalName: file.name,
      })
    } catch (error) {
      console.error('上傳失敗:', error)
      const errorMessage =
        error instanceof Error
          ? parseCloudflareError(error.message)
          : '上傳失敗'

      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.id === uploadId
            ? {
                ...item,
                status: 'error',
                error: errorMessage,
              }
            : item
        )
      )

      onError?.(errorMessage)
    }
  }

  // 上傳檔案（先全部顯示在列表，再依序上傳避免 rate limit）
  const handleUpload = async (files: File[]) => {
    // 先把所有檔案加入列表，顯示「等待中」
    const newItems: UploadingFile[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      progress: 0,
      status: 'pending' as const,
    }))

    setUploadingFiles((prev) => [...prev, ...newItems])

    // 最多同時上傳 2 個，避免 Cloudflare rate limit
    const MAX_CONCURRENT = 2
    let running = 0
    let index = 0

    const runNext = () => {
      while (running < MAX_CONCURRENT && index < newItems.length) {
        const item = newItems[index]
        index++
        running++

        // 標記為上傳中
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: 'uploading' as const } : f
          )
        )

        uploadSingleFile(item.file, item.id).finally(() => {
          running--
          runNext()
        })
      }
    }

    runNext()
  }

  // 移除上傳項目
  const removeUploadItem = (uploadId: string) => {
    setUploadingFiles((prev) => prev.filter((item) => item.id !== uploadId))
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 拖放區域 */}
      <Card
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer rounded-xl',
          isDragging
            ? 'border-[#C41E3A] bg-[#C41E3A]/10'
            : 'border-[#E5E5E5] bg-white hover:border-[#C41E3A]'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#FAFAFA] flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-[#A3A3A3]" />
          </div>
          <p className="text-[#0A0A0A] font-medium mb-2">
            拖放影片檔案到這裡上傳
          </p>
          <p className="text-[#A3A3A3] text-sm mb-4">
            支援 MP4、MOV、MKV 等格式，大檔案會自動使用分塊上傳
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
          >
            選擇影片
          </Button>
        </div>
      </Card>

      {/* 隱藏的檔案輸入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 上傳列表 */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          {uploadingFiles.map((item) => (
            <Card
              key={item.id}
              className="p-4 bg-white border-[#E5E5E5] rounded-xl"
            >
              <div className="flex items-center gap-4">
                {/* 圖示 */}
                <div className="w-12 h-12 rounded-lg bg-[#FAFAFA] flex items-center justify-center shrink-0">
                  {item.status === 'completed' ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : item.status === 'error' ? (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  ) : item.status === 'pending' ? (
                    <Film className="w-6 h-6 text-[#A3A3A3]" />
                  ) : (
                    <Film className="w-6 h-6 text-[#C41E3A]" />
                  )}
                </div>

                {/* 資訊 */}
                <div className="flex-1 min-w-0">
                  <p className="text-[#0A0A0A] font-medium truncate">
                    {item.file.name}
                  </p>
                  <p className="text-[#A3A3A3] text-sm">
                    {formatFileSize(item.file.size)}
                    {item.status === 'pending' && (
                      <span className="text-[#A3A3A3] ml-2">等待上傳</span>
                    )}
                    {item.status === 'error' && item.error && (
                      <span className="text-red-600 ml-2">{item.error}</span>
                    )}
                    {item.status === 'completed' && (
                      <span className="text-green-600 ml-2">上傳完成</span>
                    )}
                  </p>

                  {/* 進度條 */}
                  {item.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-[#FAFAFA] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#C41E3A] transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <p className="text-[#A3A3A3] text-xs mt-1">
                        {item.progress}%
                      </p>
                    </div>
                  )}
                </div>

                {/* 移除按鈕 */}
                {(item.status === 'completed' || item.status === 'error') && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeUploadItem(item.id)
                    }}
                    className="text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
