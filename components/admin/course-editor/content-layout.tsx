// components/admin/course-editor/content-layout.tsx
// 課程內容頁面的三欄式佈局
// 左側: 大綱導覽 | 中間: 單元編輯器 | 右側: 設定與預覽

'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ContentLayoutProps {
  leftPanel: ReactNode
  centerPanel: ReactNode
  rightPanel: ReactNode
  className?: string
}

export function ContentLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  className,
}: ContentLayoutProps) {
  return (
    <div className={cn('flex h-full', className)}>
      {/* 左側面板 - 大綱導覽 */}
      <aside className="w-[280px] flex-shrink-0 border-r border-[#E5E5E5] bg-white overflow-y-auto">
        {leftPanel}
      </aside>

      {/* 中間面板 - 單元編輯器 */}
      <main className="flex-1 overflow-y-auto bg-[#FAFAFA]">
        {centerPanel}
      </main>

      {/* 右側面板 - 設定與預覽 */}
      <aside className="w-[320px] flex-shrink-0 border-l border-[#E5E5E5] bg-white overflow-y-auto">
        {rightPanel}
      </aside>
    </div>
  )
}
