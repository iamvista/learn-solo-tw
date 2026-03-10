// components/admin/admin-layout-client.tsx
// Admin Layout 的 Client 包裹器
// 提供 SidebarProvider、AdminThemeProvider 和客戶端狀態管理

'use client'

import { type ReactNode } from 'react'
import { SidebarProvider } from '@/lib/contexts/sidebar-context'
import { AdminThemeProvider, useAdminTheme } from '@/lib/contexts/admin-theme-context'
import { Sidebar } from '@/components/admin/sidebar'
import { Header } from '@/components/admin/header'

interface AdminLayoutClientProps {
  children: ReactNode
  user: {
    name: string | null | undefined
    email: string | null | undefined
    image: string | null | undefined
    role: string
  }
}

function AdminLayoutInner({ children, user }: AdminLayoutClientProps) {
  const { theme } = useAdminTheme()

  return (
    <SidebarProvider>
      <div className={theme === 'dark' ? 'admin-dark' : ''}>
        <div className="flex h-screen bg-background text-foreground">
          {/* 桌面版側邊欄 */}
          <Sidebar className="hidden lg:flex" userRole={user.role} />

          {/* 主內容區域 */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* 頂部導覽 */}
            <Header user={user} />

            {/* 頁面內容 */}
            <main className="flex-1 overflow-y-auto bg-secondary">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
  return (
    <AdminThemeProvider>
      <AdminLayoutInner user={user}>{children}</AdminLayoutInner>
    </AdminThemeProvider>
  )
}
