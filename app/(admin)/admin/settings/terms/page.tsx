// app/(admin)/admin/settings/terms/page.tsx
// 服務條款編輯頁面

import { getLegalSettings } from '@/lib/actions/settings'
import { SettingsNav } from '@/components/admin/settings/settings-nav'
import { TermsEditorClient } from './client'

export const metadata = {
  title: '服務條款 | 後台設定',
}

export default async function TermsSettingsPage() {
  const legal = await getLegalSettings()

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A]">服務條款</h1>
        <p className="text-[#525252] mt-1">
          編輯服務條款內容，使用 Markdown 語法。儲存後將顯示在 /terms 頁面。
        </p>
      </div>

      <SettingsNav />

      <TermsEditorClient initialContent={legal.termsMd} />
    </div>
  )
}
