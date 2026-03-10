// app/(admin)/admin/settings/payment/page.tsx
// 金流設定頁面
// 支援 Stripe / PAYUNi 雙金流切換與設定

import { getPaymentSettings } from '@/lib/actions/settings'
import { PaymentSettingsForm } from '@/components/admin/settings/payment-settings-form'
import { SettingsNav } from '@/components/admin/settings/settings-nav'

export const metadata = {
  title: '金流設定 | 後台管理',
}

export default async function PaymentSettingsPage() {
  const settings = await getPaymentSettings()

  return (
    <div className="space-y-6 p-4">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A]">金流設定</h1>
        <p className="text-[#525252] mt-1">設定金流服務（Stripe 或 PAYUNi 統一金流）</p>
      </div>

      {/* 設定導覽 */}
      <SettingsNav />

      {/* 金流設定表單 */}
      <PaymentSettingsForm
        initialGateway={settings.gateway}
        stripe={settings.stripe}
        payuni={settings.payuni}
      />
    </div>
  )
}
