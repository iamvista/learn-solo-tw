// app/(admin)/admin/settings/page.tsx
// 系統設定頁面
// 包含基本設定、社群連結和分析追蹤

import { getSiteSettings } from '@/lib/actions/settings'
import { SiteSettingsForm } from '@/components/admin/settings/site-settings-form'
import { SettingsNav } from '@/components/admin/settings/settings-nav'

export const metadata = {
  title: '系統設定 | 後臺管理',
}

export default async function SettingsPage() {
  const settings = await getSiteSettings()

  return (
    <div className="space-y-6 p-4">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A]">系統設定</h1>
        <p className="text-[#525252] mt-1">管理網站設定和服務整合</p>
      </div>

      {/* 設定導覽 */}
      <SettingsNav />

      {/* 設定表單 */}
      <SiteSettingsForm initialSettings={settings} />
    </div>
  )
}
