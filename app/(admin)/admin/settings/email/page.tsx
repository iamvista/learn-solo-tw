// app/(admin)/admin/settings/email/page.tsx
// Email 設定頁面
// 包含發送者設定、範本預覽和測試發送

import { getEmailSettings } from '@/lib/actions/settings'
import { EmailSettingsForm } from '@/components/admin/settings/email-settings-form'
import { SettingsNav } from '@/components/admin/settings/settings-nav'

export const metadata = {
  title: 'Email 設定 | 後台管理',
}

export default async function EmailSettingsPage() {
  const emailSettings = await getEmailSettings()

  return (
    <div className="space-y-6 p-4">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A]">Email 設定</h1>
        <p className="text-[#525252] mt-1">設定系統郵件發送服務</p>
      </div>

      {/* 設定導覽 */}
      <SettingsNav />

      {/* Email 設定表單 */}
      <EmailSettingsForm
        senderName={emailSettings.senderName}
        fromEmail={emailSettings.fromEmail}
        isConfigured={emailSettings.isConfigured}
      />
    </div>
  )
}
