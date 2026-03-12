// app/(admin)/admin/settings/payment/page.tsx
// 金流設定頁面
// PAYUNi 統一金流設定

import { getPaymentSettings } from "@/lib/actions/settings";
import { PaymentSettingsForm } from "@/components/admin/settings/payment-settings-form";
import { SettingsNav } from "@/components/admin/settings/settings-nav";

export const metadata = {
  title: "金流設定 | 後臺管理",
};

export default async function PaymentSettingsPage() {
  const settings = await getPaymentSettings();

  return (
    <div className="space-y-6 p-4">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A]">金流設定</h1>
        <p className="text-[#525252] mt-1">設定 PAYUNi 統一金流服務</p>
      </div>

      {/* 設定導覽 */}
      <SettingsNav />

      {/* 金流設定表單 */}
      <PaymentSettingsForm payuni={settings.payuni} />
    </div>
  );
}
