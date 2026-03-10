import { getLayoutSettings } from '@/lib/actions/settings'
import { LayoutSettingsForm } from '@/components/admin/settings/layout-settings-form'
import { SettingsNav } from '@/components/admin/settings/settings-nav'

export const metadata = {
  title: '版面設定 | 後台',
}

export default async function LayoutSettingsPage() {
  const layoutSettings = await getLayoutSettings()

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A]">版面設定</h1>
        <p className="text-[#525252] mt-1">自訂 Header 導航連結與 Footer 內容</p>
      </div>

      <SettingsNav />

      <LayoutSettingsForm initialData={layoutSettings} />
    </div>
  )
}
