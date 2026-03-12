// app/(admin)/admin/users/admins/page.tsx
// 管理員列表頁
// 顯示所有管理員和編輯者，支援角色切換

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getAdminUsers } from '@/lib/actions/users'
import { AdminTable } from '@/components/admin/users/admin-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Shield, AlertTriangle } from 'lucide-react'

export const metadata = {
  title: '管理員設定',
}

export default async function AdminsPage() {
  // 取得當前用戶
  const session = await auth()

  // 只有 ADMIN 可以存取此頁面
  if (session?.user?.role !== 'ADMIN') {
    redirect('/admin/users')
  }

  // 取得管理員列表
  const admins = await getAdminUsers()

  // 計算統計
  const adminCount = admins.filter((a) => a.role === 'ADMIN').length
  const editorCount = admins.filter((a) => a.role === 'EDITOR').length

  return (
    <div className="space-y-6 p-4">
      {/* 頁面標題 */}
      <div className="flex items-center gap-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]"
        >
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回學員管理
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-[#0A0A0A]">管理員設定</h2>
          <p className="text-[#525252] mt-1">
            管理系統管理員和編輯者權限
          </p>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-white border-[#E5E5E5] rounded-xl">
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center">
                <Shield className="h-6 w-6 text-[#C41E3A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0A0A0A]">{adminCount}</p>
                <p className="text-sm text-[#525252]">管理員</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E5E5E5] rounded-xl">
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center">
                <Shield className="h-6 w-6 text-[#525252]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0A0A0A]">{editorCount}</p>
                <p className="text-sm text-[#525252]">編輯者</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 警告提示 */}
      <Card className="bg-amber-50 border-amber-200 rounded-xl">
        <CardContent>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-700">注意事項</p>
              <ul className="text-sm text-amber-700 mt-1 space-y-1 list-disc list-inside">
                <li>系統必須保留至少一位管理員</li>
                <li>您無法修改自己的角色</li>
                <li>將管理員降級為學員將移除其管理權限</li>
                <li>角色變更會立即生效</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 管理員列表 */}
      <Card className="bg-white border-[#E5E5E5] rounded-xl">
        <CardHeader>
          <CardTitle className="text-[#0A0A0A]">權限管理</CardTitle>
          <CardDescription className="text-[#525252]">
            管理所有具有管理權限的用戶
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminTable admins={admins} currentUserId={session.user.id as string} />
        </CardContent>
      </Card>
    </div>
  )
}
