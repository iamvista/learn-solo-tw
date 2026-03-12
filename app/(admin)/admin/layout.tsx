// app/(admin)/admin/layout.tsx
// 後臺管理系統 Layout
// 包含側邊欄、頂部導覽和權限檢查

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AdminLayoutClient } from '@/components/admin/admin-layout-client'
import { checkNeedsSetup } from '@/lib/actions/setup'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '後臺管理',
}

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // 檢查系統是否需要初始化（無任何管理員）
  const needsSetup = await checkNeedsSetup()
  if (needsSetup) {
    redirect('/admin/setup')
  }

  // 取得當前用戶 Session
  const session = await auth()
  // 檢查用戶是否已登入
  if (!session?.user) {
    redirect('/login')
  }

  // 檢查用戶權限（僅 ADMIN 和 EDITOR 可存取）
  const userRole = session.user.role
  if (userRole !== 'ADMIN' && userRole !== 'EDITOR') {
    redirect('/')
  }

  return (
    <AdminLayoutClient
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role as string,
      }}
    >
      {children}
    </AdminLayoutClient>
  )
}
