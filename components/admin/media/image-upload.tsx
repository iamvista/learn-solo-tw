// components/admin/media/image-upload.tsx
// 圖片上傳元件
// 上傳到 Cloudflare R2

'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  onUploadComplete?: (media: {
    id: string
    url: string
    originalName: string
  }) => void
  onError?: (error: string) => void
  multiple?: boolean
  maxSize?: number // in MB
  className?: string
}

interface UploadingFile {
  id: string
  file: File
  preview: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
  mediaId?: string
  url?: string
}

export function ImageUpload({
  onUploadComplete,
  onError,
  multiple = true,
  maxSize = 10, // 10MB default
  className,
}: ImageUploadProps) {
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
      file.type.startsWith('image/')
    )

    if (files.length > 0) {
      handleUpload(multiple ? files : [files[0]])
    }
  }, [multiple])

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
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'IMAGE')

      const response = await fetch('/api/admin/media/r2-upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '上傳失敗')
      }

      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.id === uploadId
            ? {
                ...item,
                status: 'completed',
                progress: 100,
                mediaId: data.media.id,
                url: data.url,
              }
            : item
        )
      )

      onUploadComplete?.({
        id: data.media.id,
        url: data.url,
        originalName: file.name,
      })
    } catch (error) {
      console.error('上傳失敗:', error)
      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.id === uploadId
            ? {
                ...item,
                status: 'error',
                error: error instanceof Error ? error.message : '上傳失敗',
              }
            : item
        )
      )
      onError?.(error instanceof Error ? error.message : '上傳失敗')
    }
  }

  // 上傳檔案（先全部顯示在列表，再限制並發數上傳）
  const handleUpload = (files: File[]) => {
    // 先過濾超過大小限制的檔案
    const validFiles: { file: File; uploadId: string; preview: string }[] = []

    for (const file of files) {
      if (file.size > maxSize * 1024 * 1024) {
        onError?.(`檔案 ${file.name} 超過 ${maxSize}MB 限制`)
        continue
      }
      validFiles.push({
        file,
        uploadId: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        preview: URL.createObjectURL(file),
      })
    }

    if (validFiles.length === 0) return

    // 一次把所有檔案加入列表
    setUploadingFiles((prev) => [
      ...prev,
      ...validFiles.map(({ file, uploadId, preview }) => ({
        id: uploadId,
        file,
        preview,
        progress: 0,
        status: 'uploading' as const,
      })),
    ])

    // 最多同時上傳 3 個
    const MAX_CONCURRENT = 3
    let running = 0
    let index = 0

    const runNext = () => {
      while (running < MAX_CONCURRENT && index < validFiles.length) {
        const { file, uploadId } = validFiles[index]
        index++
        running++
        uploadSingleFile(file, uploadId).finally(() => {
          running--
          runNext()
        })
      }
    }

    runNext()
  }

  // 移除上傳項目
  const removeUploadItem = (uploadId: string) => {
    setUploadingFiles((prev) => {
      const item = prev.find((i) => i.id === uploadId)
      if (item?.preview) {
        URL.revokeObjectURL(item.preview)
      }
      return prev.filter((i) => i.id !== uploadId)
    })
  }

  // 格式化檔案大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 拖放區域 */}
      <Card
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer rounded-xl',
          isDragging
            ? 'border-[#F5A524] bg-[#F5A524]/10'
            : 'border-[#E5E5E5] bg-white hover:border-[#F5A524]'
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
            拖放圖片檔案到這裡上傳
          </p>
          <p className="text-[#A3A3A3] text-sm mb-4">
            支援 JPG、PNG、GIF、WebP 等格式，單檔最大 {maxSize}MB
          </p>
          <Button variant="outline" size="sm" className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg">
            選擇圖片
          </Button>
        </div>
      </Card>

      {/* 隱藏的檔案輸入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 上傳列表 */}
      {uploadingFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {uploadingFiles.map((item) => (
            <Card
              key={item.id}
              className="relative overflow-hidden bg-white border-[#E5E5E5] rounded-xl"
            >
              {/* 預覽圖 */}
              <div className="aspect-square relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="object-cover"
                />

                {/* 上傳中遮罩 */}
                {item.status === 'uploading' && (
                  <div className="absolute inset-0 bg-[#0A0A0A]/60 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-[#F5A524] animate-spin mx-auto mb-2" />
                      <p className="text-white text-sm">上傳中...</p>
                    </div>
                  </div>
                )}

                {/* 完成狀態 */}
                {item.status === 'completed' && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                {/* 錯誤狀態 */}
                {item.status === 'error' && (
                  <div className="absolute inset-0 bg-red-50 flex items-center justify-center">
                    <div className="text-center p-2">
                      <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-red-600 text-xs">{item.error}</p>
                    </div>
                  </div>
                )}

                {/* 移除按鈕 */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-2 left-2 bg-[#0A0A0A]/50 hover:bg-[#0A0A0A]/70"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeUploadItem(item.id)
                  }}
                >
                  <X className="w-4 h-4 text-white" />
                </Button>
              </div>

              {/* 資訊 */}
              <div className="p-3">
                <p className="text-[#0A0A0A] text-sm truncate">{item.file.name}</p>
                <p className="text-[#A3A3A3] text-xs">
                  {formatFileSize(item.file.size)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
