// app/(admin)/admin/settings/privacy/page.tsx
// 隱私權政策編輯頁面

import { getLegalSettings } from '@/lib/actions/settings'
import { SettingsNav } from '@/components/admin/settings/settings-nav'
import { PrivacyEditorClient } from './client'

export const metadata = {
  title: '隱私權政策 | 後台設定',
}

export default async function PrivacySettingsPage() {
  const legal = await getLegalSettings()

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A]">隱私權政策</h1>
        <p className="text-[#525252] mt-1">
          編輯隱私權政策內容，使用 Markdown 語法。儲存後將顯示在 /privacy 頁面。
        </p>
      </div>

      <SettingsNav />

      <PrivacyEditorClient initialContent={legal.privacyMd} />
    </div>
  )
}
