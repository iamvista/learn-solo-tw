// components/admin/ai-course/folder-drop-zone.tsx
// 資料夾拖放區域元件

'use client'

import { useState, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FolderOpen, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseFileList, type ParsedChapter } from '@/lib/utils/folder-parser'

// 需要過濾的檔案/資料夾名稱
const IGNORED_PATTERNS = [
  /^\./, // 隱藏檔案 (.DS_Store, .git, etc.)
  /^__MACOSX$/, // macOS 壓縮檔產生的資料夾
  /^Thumbs\.db$/i, // Windows 縮圖快取
  /^desktop\.ini$/i, // Windows 桌面設定
  /^\.Spotlight-/, // macOS Spotlight 索引
  /^\.Trashes$/, // macOS 垃圾桶
  /^\.fseventsd$/, // macOS 檔案系統事件
  /^node_modules$/, // Node.js 依賴
]

// 允許的檔案副檔名
const ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.mkv', '.webm', '.srt']

// 檢查是否應該忽略此檔案/資料夾
function shouldIgnore(name: string): boolean {
  return IGNORED_PATTERNS.some((pattern) => pattern.test(name))
}

// 檢查檔案是否為允許的類型
function isAllowedFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase()
  return ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
}

// 過濾檔案陣列
function filterFiles(files: File[]): File[] {
  return files.filter((file) => {
    const pathParts = file.webkitRelativePath?.split('/') || [file.name]
    // 檢查路徑中的每一層是否有需要忽略的
    const hasIgnoredPart = pathParts.some((part) => shouldIgnore(part))
    if (hasIgnoredPart) return false
    // 只保留允許的檔案類型
    return isAllowedFile(file.name)
  })
}

interface FolderDropZoneProps {
  onFolderParsed: (chapters: ParsedChapter[], files: File[]) => void
  className?: string
}

export function FolderDropZone({ onFolderParsed, className }: FolderDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 處理解析後的檔案
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setIsProcessing(true)
      try {
        const fileArray = Array.from(files)
        // 過濾掉隱藏檔案和系統檔案
        const filteredFiles = filterFiles(fileArray)
        console.log(`過濾後檔案數: ${filteredFiles.length} (原始: ${fileArray.length})`)
        const chapters = parseFileList(filteredFiles)
        onFolderParsed(chapters, filteredFiles)
      } catch (error) {
        console.error('解析資料夾失敗:', error)
      } finally {
        setIsProcessing(false)
      }
    },
    [onFolderParsed]
  )

  // 拖放處理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const items = e.dataTransfer.items
      if (!items || items.length === 0) return

      // 收集所有檔案
      const allFiles: File[] = []

      // 遞迴讀取資料夾內容
      const readEntry = async (entry: FileSystemEntry, path: string = ''): Promise<void> => {
        // 過濾掉隱藏檔案和系統檔案/資料夾
        if (shouldIgnore(entry.name)) {
          return
        }

        if (entry.isFile) {
          const fileEntry = entry as FileSystemFileEntry
          return new Promise((resolve) => {
            fileEntry.file((file) => {
              // 使用 Object.defineProperty 設定 webkitRelativePath
              const newFile = new File([file], file.name, { type: file.type })
              Object.defineProperty(newFile, 'webkitRelativePath', {
                value: path + file.name,
                writable: false,
              })
              allFiles.push(newFile)
              resolve()
            })
          })
        } else if (entry.isDirectory) {
          const dirEntry = entry as FileSystemDirectoryEntry
          const reader = dirEntry.createReader()

          return new Promise((resolve) => {
            const readEntries = () => {
              reader.readEntries(async (entries) => {
                if (entries.length === 0) {
                  resolve()
                  return
                }

                for (const childEntry of entries) {
                  await readEntry(childEntry, path + entry.name + '/')
                }
                readEntries() // 繼續讀取更多條目
              })
            }
            readEntries()
          })
        }
      }

      // 處理拖放的項目
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const entry = item.webkitGetAsEntry?.()
        if (entry) {
          await readEntry(entry)
        }
      }

      if (allFiles.length > 0) {
        handleFiles(allFiles)
      }
    },
    [handleFiles]
  )

  // 點擊選擇資料夾
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFiles(files)
      }
      // 清空 input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFiles]
  )

  return (
    <div className={cn('space-y-4', className)}>
      <Card
        className={cn(
          'border-2 border-dashed transition-all cursor-pointer rounded-xl',
          isDragging
            ? 'border-[#C41E3A] bg-[#C41E3A]/10 scale-[1.02]'
            : 'border-[#E5E5E5] bg-white hover:border-[#C41E3A] hover:bg-[#FAFAFA]',
          isProcessing && 'opacity-50 pointer-events-none'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-[#FAFAFA] flex items-center justify-center mb-6">
            {isDragging ? (
              <Upload className="w-10 h-10 text-[#C41E3A]" />
            ) : (
              <FolderOpen className="w-10 h-10 text-[#A3A3A3]" />
            )}
          </div>

          <p className="text-[#0A0A0A] font-semibold text-lg mb-2">
            {isProcessing ? '正在解析資料夾...' : '拖放課程資料夾到這裡'}
          </p>

          <p className="text-[#A3A3A3] text-sm mb-6 max-w-md">
            將包含課程單元的資料夾拖入此區域，系統會自動識別結構。
            <br />
            每個子資料夾應命名為 <code className="bg-[#FAFAFA] px-1 rounded">1-1</code>、
            <code className="bg-[#FAFAFA] px-1 rounded">1-2</code> 等格式，
            並包含對應的 MP4 和 SRT 檔案。
          </p>

          <Button
            variant="outline"
            size="sm"
            className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
            disabled={isProcessing}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            選擇資料夾
          </Button>
        </div>
      </Card>

      {/* 隱藏的檔案輸入 (支援資料夾選擇) */}
      <input
        ref={fileInputRef}
        type="file"
        // @ts-expect-error webkitdirectory 是非標準屬性
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 格式說明 */}
      <div className="text-xs text-[#A3A3A3] space-y-1">
        <p className="font-medium text-[#525252]">資料夾格式說明：</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>
            資料夾命名：<code className="bg-[#FAFAFA] px-1 rounded">1</code>、
            <code className="bg-[#FAFAFA] px-1 rounded">1-1</code>、
            <code className="bg-[#FAFAFA] px-1 rounded">2-3</code> 等
          </li>
          <li>
            每個資料夾內需有：<code className="bg-[#FAFAFA] px-1 rounded">1-1.mp4</code> 和{' '}
            <code className="bg-[#FAFAFA] px-1 rounded">1-1.srt</code>
          </li>
          <li>系統會自動依據命名歸類章節和單元</li>
        </ul>
      </div>
    </div>
  )
}
