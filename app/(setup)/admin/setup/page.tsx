// app/(setup)/admin/setup/page.tsx
// 系統初始化頁面
// 類似 Ghost 的初始化機制，首次部署時引導用戶完成基本設定
// 此頁面放在獨立 route group 中，不受 admin layout 的權限檢查限制

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { checkNeedsSetup } from '@/lib/actions/setup'
import { SetupClient } from './setup-client'

export const metadata = {
  title: '系統初始化',
}

export default async function SetupPage() {
  // 檢查是否需要初始化
  const needsSetup = await checkNeedsSetup()

  if (!needsSetup) {
    // 已有管理員，檢查當前用戶是否有權限進入後台
    const session = await auth()
    const role = session?.user?.role
    if (role === 'ADMIN' || role === 'EDITOR') {
      redirect('/admin')
    }
    // 非管理員用戶，導回首頁
    redirect('/')
  }

  // 檢查用戶是否已登入
  const session = await auth()

  if (!session?.user) {
    redirect('/login?callbackUrl=/admin/setup')
  }

  return (
    <SetupClient
      user={{
        name: session.user.name || '',
        email: session.user.email || '',
      }}
    />
  )
}
