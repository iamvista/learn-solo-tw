// app/(setup)/admin/setup/setup-client.tsx
// 系統初始化表單客戶端元件
// 分步驟引導用戶完成網站基本設定

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { completeSetup, type SetupFormData } from '@/lib/actions/setup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Loader2,
  Globe,
  CreditCard,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Rocket,
  SkipForward,
} from 'lucide-react'

interface SetupClientProps {
  user: {
    name: string
    email: string
  }
}

const STEPS = [
  { id: 'welcome', label: '歡迎', icon: Rocket },
  { id: 'basic', label: '基本設定', icon: Globe },
  { id: 'payment', label: '金流設定', icon: CreditCard },
  { id: 'analytics', label: '追蹤像素', icon: BarChart3 },
] as const

type GatewayType = 'payuni' | ''

export function SetupClient({ user }: SetupClientProps) {
  const router = useRouter()
  const { update: updateSession } = useSession()
  const [isPending, startTransition] = useTransition()
  const [currentStep, setCurrentStep] = useState(0)

  // 表單狀態
  const [siteName, setSiteName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [paymentGateway, setPaymentGateway] = useState<GatewayType>('')
  const [payuniMerchantId, setPayuniMerchantId] = useState('')
  const [payuniHashKey, setPayuniHashKey] = useState('')
  const [payuniHashIV, setPayuniHashIV] = useState('')
  const [payuniTestMode, setPayuniTestMode] = useState(true)
  const [gaId, setGaId] = useState('')
  const [metaPixelId, setMetaPixelId] = useState('')
  const [metaCapiAccessToken, setMetaCapiAccessToken] = useState('')
  function goNext() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    }
  }

  function goPrev() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }

  async function handleComplete() {
    const data: SetupFormData = {
      siteName: siteName || undefined,
      contactEmail: contactEmail || undefined,
      paymentGateway: paymentGateway || undefined,
      payuniMerchantId: payuniMerchantId || undefined,
      payuniHashKey: payuniHashKey || undefined,
      payuniHashIV: payuniHashIV || undefined,
      payuniTestMode,
      gaId: gaId || undefined,
      metaPixelId: metaPixelId || undefined,
      metaCapiAccessToken: metaCapiAccessToken || undefined,
    }

    startTransition(async () => {
      const result = await completeSetup(data)
      if (result.success) {
        // 傳入物件才會觸發 JWT callback 的 trigger: 'update'
        // 使 JWT 從 DB 讀取最新的 ADMIN 角色並更新 cookie
        await updateSession({ role: 'ADMIN' })
        toast.success('系統初始化完成！歡迎使用後台管理系統')
        // 使用硬導向確保瀏覽器帶著更新後的 JWT cookie 發起請求
        window.location.href = '/admin'
      } else {
        toast.error(result.error || '初始化失敗')
      }
    })
  }

  const isLastStep = currentStep === STEPS.length - 1

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* 頂部進度條 */}
      <div className="bg-white border-b border-[#E5E5E5] px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-[#0A0A0A]">系統初始化</h1>
            <span className="text-sm text-[#A3A3A3]">
              {currentStep + 1} / {STEPS.length}
            </span>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((step, i) => (
              <div
                key={step.id}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= currentStep ? 'bg-[#F5A524]' : 'bg-[#E5E5E5]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 步驟內容 */}
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Step 0: 歡迎 */}
          {currentStep === 0 && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#F5A524]/10">
                <Rocket className="w-10 h-10 text-[#F5A524]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-[#0A0A0A]">
                  歡迎使用課程平台！
                </h2>
                <p className="text-[#525252] max-w-md mx-auto">
                  嗨 {user.name || user.email}，讓我們花幾分鐘完成基本設定，幫助你快速開始使用。
                </p>
              </div>
              <Card className="bg-white border border-[#E5E5E5] rounded-xl text-left">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <p className="text-sm text-[#525252]">
                      接下來會引導你設定以下項目：
                    </p>
                    <ul className="space-y-2">
                      {STEPS.slice(1).map((step) => {
                        const Icon = step.icon
                        return (
                          <li
                            key={step.id}
                            className="flex items-center gap-3 text-sm text-[#0A0A0A]"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-[#525252]" />
                            </div>
                            {step.label}
                          </li>
                        )
                      })}
                    </ul>
                    <p className="text-xs text-[#A3A3A3] pt-2 border-t border-[#F5F5F5]">
                      所有項目都可以跳過，之後隨時可以在「後台設定」頁面中修改。
                    </p>
                  </div>
                </CardContent>
              </Card>
              <p className="text-sm text-[#A3A3A3]">
                完成初始化後，你的帳號（{user.email}）將被設為管理員。
              </p>
            </div>
          )}

          {/* Step 1: 基本設定 */}
          {currentStep === 1 && (
            <Card className="bg-white border border-[#E5E5E5] rounded-xl">
              <CardHeader>
                <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#F5A524]" />
                  基本設定
                </CardTitle>
                <CardDescription className="text-[#525252]">
                  設定網站的基本資訊。這些欄位之後都可以在「設定」頁面修改。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#0A0A0A]">站點名稱</Label>
                  <Input
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="例如：我的線上課程"
                    className="border-[#E5E5E5] focus:border-[#F5A524] focus-visible:ring-[#F5A524]/20"
                  />
                  <p className="text-xs text-[#A3A3A3]">
                    顯示在網站標題和 Email 中的名稱
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#0A0A0A]">聯絡 Email</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@example.com"
                    className="border-[#E5E5E5] focus:border-[#F5A524] focus-visible:ring-[#F5A524]/20"
                  />
                  <p className="text-xs text-[#A3A3A3]">
                    用於接收用戶聯繫的 Email 地址
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: 金流設定 */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <Card className="bg-white border border-[#E5E5E5] rounded-xl">
                <CardHeader>
                  <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#F5A524]" />
                    金流設定
                  </CardTitle>
                  <CardDescription className="text-[#525252]">
                    設定 PAYUNi 統一金流。如果還沒有金流帳號，可以先跳過，之後到「設定 → 金流」再設定。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentGateway(paymentGateway === 'payuni' ? '' : 'payuni')}
                      className={`flex-1 rounded-xl border-2 p-4 text-left transition-all ${
                        paymentGateway === 'payuni'
                          ? 'border-[#F5A524] bg-[#F5A524]/5'
                          : 'border-[#E5E5E5] hover:border-[#A3A3A3]'
                      }`}
                    >
                      <p className="font-semibold text-[#0A0A0A]">PAYUNi 統一金流</p>
                      <p className="text-xs text-[#525252] mt-1">
                        台灣在地金流，支援信用卡、超商代碼、ATM
                      </p>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* PAYUNi 詳細設定 */}
              {paymentGateway === 'payuni' && (
                <Card className="bg-white border border-[#E5E5E5] rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-[#0A0A0A] text-base">PAYUNi 設定</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[#0A0A0A]">商店代號 (MerID)</Label>
                      <Input
                        value={payuniMerchantId}
                        onChange={(e) => setPayuniMerchantId(e.target.value)}
                        placeholder="U00000000"
                        className="border-[#E5E5E5] font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#0A0A0A]">Hash Key（32 字元）</Label>
                      <Input
                        type="password"
                        value={payuniHashKey}
                        onChange={(e) => setPayuniHashKey(e.target.value)}
                        placeholder="32 字元加密金鑰"
                        className="border-[#E5E5E5] font-mono text-sm"
                        maxLength={32}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#0A0A0A]">Hash IV（16 字元）</Label>
                      <Input
                        type="password"
                        value={payuniHashIV}
                        onChange={(e) => setPayuniHashIV(e.target.value)}
                        placeholder="16 字元加密向量"
                        className="border-[#E5E5E5] font-mono text-sm"
                        maxLength={16}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={payuniTestMode}
                        onChange={(e) => setPayuniTestMode(e.target.checked)}
                        className="h-4 w-4 rounded border-[#D4D4D4]"
                      />
                      <span className="text-sm text-[#0A0A0A]">
                        測試模式（Sandbox）
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: 追蹤像素 */}
          {currentStep === 3 && (
            <Card className="bg-white border border-[#E5E5E5] rounded-xl">
              <CardHeader>
                <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#F5A524]" />
                  追蹤像素
                </CardTitle>
                <CardDescription className="text-[#525252]">
                  設定 Google Analytics 和 Meta Pixel，追蹤網站流量和轉換。可以之後再到「設定 → 基本設定」補填。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#0A0A0A]">Google Analytics ID</Label>
                  <Input
                    value={gaId}
                    onChange={(e) => setGaId(e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className="border-[#E5E5E5] font-mono text-sm"
                  />
                  <p className="text-xs text-[#A3A3A3]">
                    在 Google Analytics 後台 → 管理 → 資料串流中找到，格式為 G- 開頭
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#0A0A0A]">Meta Pixel ID</Label>
                  <Input
                    value={metaPixelId}
                    onChange={(e) => setMetaPixelId(e.target.value)}
                    placeholder="123456789012345"
                    className="border-[#E5E5E5] font-mono text-sm"
                  />
                  <p className="text-xs text-[#A3A3A3]">
                    在 Meta Events Manager → 資料來源中找到，為 15-16 位數字
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#0A0A0A]">
                    Meta Conversions API Access Token
                  </Label>
                  <Input
                    type="password"
                    value={metaCapiAccessToken}
                    onChange={(e) => setMetaCapiAccessToken(e.target.value)}
                    placeholder="EAAxxxxxxxxxxxxxxx..."
                    className="border-[#E5E5E5] font-mono text-sm"
                  />
                  <p className="text-xs text-[#A3A3A3]">
                    用於伺服器端事件追蹤，不填則僅使用瀏覽器端 Pixel
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 底部操作按鈕 */}
          <div className="flex items-center justify-between mt-6">
            <div>
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={goPrev}
                  className="text-[#525252] hover:text-[#0A0A0A]"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  上一步
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* 跳過按鈕（非歡迎頁和最後一步） */}
              {currentStep > 0 && !isLastStep && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={goNext}
                  className="text-[#A3A3A3] hover:text-[#525252]"
                >
                  <SkipForward className="w-4 h-4 mr-1" />
                  跳過
                </Button>
              )}

              {!isLastStep ? (
                <Button
                  type="button"
                  onClick={goNext}
                  className="bg-[#F5A524] hover:bg-[#E09000] text-white rounded-full px-6"
                >
                  {currentStep === 0 ? '開始設定' : '下一步'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleComplete}
                  disabled={isPending}
                  className="bg-[#F5A524] hover:bg-[#E09000] text-white rounded-full px-8"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      初始化中...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 mr-2" />
                      完成初始化
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
