// components/admin/course-editor/tab-header.tsx
// 課程編輯器的 Tab 導航標題
// 三個 Tab: 課程資訊、課程內容、結果分析

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  FileText,
  LayoutList,
  BarChart3,
  ArrowLeft,
  MessageCircle,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TabHeaderProps {
  courseId: string
  courseTitle: string
}

const tabs = [
  {
    id: 'info',
    label: '課程資訊',
    icon: FileText,
    href: (courseId: string) => `/admin/courses/${courseId}/info`,
  },
  {
    id: 'content',
    label: '課程內容',
    icon: LayoutList,
    href: (courseId: string) => `/admin/courses/${courseId}/content`,
  },
  {
    id: 'comments',
    label: '課程留言',
    icon: MessageCircle,
    href: (courseId: string) => `/admin/courses/${courseId}/comments`,
  },
  {
    id: 'analytics',
    label: '結果分析',
    icon: BarChart3,
    href: (courseId: string) => `/admin/courses/${courseId}/analytics`,
  },
  {
    id: 'welcome-email',
    label: '歡迎信',
    icon: Mail,
    href: (courseId: string) => `/admin/courses/${courseId}/welcome-email`,
  },
]

export function TabHeader({ courseId, courseTitle }: TabHeaderProps) {
  const pathname = usePathname()

  // 根據路徑判斷當前 tab
  const getCurrentTab = () => {
    if (pathname.includes('/content')) return 'content'
    if (pathname.includes('/comments')) return 'comments'
    if (pathname.includes('/analytics')) return 'analytics'
    if (pathname.includes('/welcome-email')) return 'welcome-email'
    return 'info'
  }

  const currentTab = getCurrentTab()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E5E5E5] bg-white px-4">
      {/* 左側：返回按鈕和課程標題 */}
      <div className="flex items-center gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]"
        >
          <Link href="/admin/courses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-[#0A0A0A] truncate max-w-[200px]">
            {courseTitle}
          </p>
        </div>
      </div>

      {/* 中間：Tab 導航 */}
      <nav className="flex items-center gap-1">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id
          const Icon = tab.icon

          return (
            <Link
              key={tab.id}
              href={tab.href(courseId)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-lg',
                isActive
                  ? 'text-[#F5A524]'
                  : 'text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {/* Active 指示器 */}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#F5A524] rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* 右側：預留空間（可放儲存按鈕等） */}
      <div className="w-[120px]" />
    </header>
  )
}
