/* eslint-disable @next/next/no-img-element */
// components/admin/settings/site-settings-form.tsx
// 站點設定表單元件
// 包含基本設定、社群連結和分析追蹤設定

'use client'

import { useTransition, useRef, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Image from 'next/image'
import {
  siteSettingsSchema,
  type SiteSettingsFormData,
  SETTING_KEYS,
} from '@/lib/validations/settings'
import { updateSiteSettings } from '@/lib/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Save, Globe, BarChart3, Upload, X } from 'lucide-react'

interface SiteSettingsFormProps {
  initialSettings: Record<string, string>
}

export function SiteSettingsForm({ initialSettings }: SiteSettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // 初始化表單
  const form = useForm<SiteSettingsFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(siteSettingsSchema) as any,
    defaultValues: {
      siteName: initialSettings[SETTING_KEYS.SITE_NAME] || '我的課程平臺',
      siteLogo: initialSettings[SETTING_KEYS.SITE_LOGO] || '',
      contactEmail: initialSettings[SETTING_KEYS.CONTACT_EMAIL] || '',
      brandDisplayName: initialSettings[SETTING_KEYS.BRAND_DISPLAY_NAME] || '',
      brandSubtitle: initialSettings[SETTING_KEYS.BRAND_SUBTITLE] || '',
      gaId: initialSettings[SETTING_KEYS.GA_ID] || '',
      posthogKey: initialSettings[SETTING_KEYS.POSTHOG_KEY] || '',
      posthogHost: initialSettings[SETTING_KEYS.POSTHOG_HOST] || '',
      posthogPersonalApiKey: initialSettings[SETTING_KEYS.POSTHOG_PERSONAL_API_KEY] || '',
      metaPixelId: initialSettings[SETTING_KEYS.META_PIXEL_ID] || '',
      metaCapiAccessToken: initialSettings[SETTING_KEYS.META_CAPI_ACCESS_TOKEN] || '',
    },
  })

  // Logo 上傳處理
  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (!file.type.startsWith('image/')) {
        toast.error('請選擇圖片檔案')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('圖片大小不能超過 5MB')
        return
      }

      setIsUploadingLogo(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'IMAGE')

        const response = await fetch('/api/admin/media/r2-upload', {
          method: 'POST',
          body: formData,
        })
        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || '上傳失敗')
        }

        form.setValue('siteLogo', data.url, { shouldDirty: true })
        toast.success('Logo 上傳成功')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '上傳失敗')
      } finally {
        setIsUploadingLogo(false)
        if (logoInputRef.current) {
          logoInputRef.current.value = ''
        }
      }
    },
    [form]
  )

  // 提交表單
  async function onSubmit(data: SiteSettingsFormData) {
    startTransition(async () => {
      try {
        const result = await updateSiteSettings(data)

        if (result.success) {
          toast.success('設定已儲存')
        } else {
          toast.error(result.error ?? '儲存設定失敗')
        }
      } catch {
        toast.error('操作失敗，請稍後再試')
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList>
            <TabsTrigger
              value="basic"
              className="data-[state=active]:bg-[#C41E3A] data-[state=active]:text-white"
            >
              <Globe className="h-4 w-4 mr-2" />
              基本設定
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-[#C41E3A] data-[state=active]:text-white"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              分析追蹤
            </TabsTrigger>
          </TabsList>

          {/* 基本設定 */}
          <TabsContent value="basic">
            <Card className="bg-white border border-[#E5E5E5] rounded-xl">
              <CardHeader>
                <CardTitle className="text-[#0A0A0A]">基本設定</CardTitle>
                <CardDescription className="text-[#525252]">
                  設定網站的基本資訊
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 站點名稱 */}
                <FormField
                  control={form.control}
                  name="siteName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#0A0A0A]">
                        站點名稱 <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="我的課程平臺"
                          className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#C41E3A] focus-visible:ring-[#C41E3A]/20"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-[#A3A3A3]">
                        顯示在網站標題和 Email 中的名稱
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Logo 上傳 */}
                <FormField
                  control={form.control}
                  name="siteLogo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#0A0A0A]">網站 Logo</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          {/* 預覽區 */}
                          {field.value ? (
                            <div className="flex items-center gap-4">
                              <div className="relative w-16 h-16 rounded-lg border border-[#E5E5E5] overflow-hidden bg-[#FAFAFA] shrink-0">
                                <img
                                  src={field.value}
                                  alt="Logo"
                                  className="object-contain"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] rounded-lg"
                                  disabled={isUploadingLogo}
                                  onClick={() => logoInputRef.current?.click()}
                                >
                                  {isUploadingLogo ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                  )}
                                  更換圖片
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                  onClick={() =>
                                    form.setValue('siteLogo', '', {
                                      shouldDirty: true,
                                    })
                                  }
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  移除
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-[#E5E5E5] rounded-xl cursor-pointer hover:border-[#C41E3A] transition-colors bg-white"
                              onClick={() => logoInputRef.current?.click()}
                            >
                              {isUploadingLogo ? (
                                <Loader2 className="w-8 h-8 text-[#C41E3A] animate-spin mb-2" />
                              ) : (
                                <Upload className="w-8 h-8 text-[#A3A3A3] mb-2" />
                              )}
                              <p className="text-[#525252] text-sm font-medium">
                                {isUploadingLogo ? '上傳中...' : '點擊上傳 Logo 圖片'}
                              </p>
                              <p className="text-[#A3A3A3] text-xs mt-1">
                                支援 JPG、PNG、WebP，最大 5MB
                              </p>
                            </div>
                          )}
                          {/* 隱藏的 file input */}
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-[#A3A3A3]">
                        上傳網站 Logo（也會用作網站 Icon / Favicon），未設定則使用預設圖示
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 聯絡 Email */}
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#0A0A0A]">聯絡 Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contact@example.com"
                          className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#C41E3A] focus-visible:ring-[#C41E3A]/20"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription className="text-[#A3A3A3]">
                        用於接收用戶聯繫的 Email 地址
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brandDisplayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#0A0A0A]">品牌顯示名稱</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="講師名稱"
                          className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#C41E3A] focus-visible:ring-[#C41E3A]/20"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription className="text-[#A3A3A3]">
                        會顯示在 Logo、頁尾等品牌位置
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brandSubtitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#0A0A0A]">品牌副標</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="線上課程"
                          className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#C41E3A] focus-visible:ring-[#C41E3A]/20"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription className="text-[#A3A3A3]">
                        顯示在品牌名稱下方的短句
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 分析追蹤 */}
          <TabsContent className='flex flex-col gap-4' value="analytics">
            <Card className="bg-white border border-[#E5E5E5] rounded-xl">
              <CardHeader>
                <CardTitle className="text-[#0A0A0A]">分析追蹤</CardTitle>
                <CardDescription className="text-[#525252]">
                  設定網站分析和追蹤工具
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Google Analytics ID */}
                <FormField
                  control={form.control}
                  name="gaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#0A0A0A]">
                        Google Analytics ID
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="G-XXXXXXXXXX"
                          className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#C41E3A] focus-visible:ring-[#C41E3A]/20"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription className="text-[#A3A3A3]">
                        在 Google Analytics 後臺 → 管理 → 資料串流 → 網頁串流中找到，格式為 G- 開頭（例如 G-ABC123XYZ）
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* PostHog */}
            <Card className="bg-white border border-[#E5E5E5] rounded-xl">
              <CardHeader>
                <CardTitle className="text-[#0A0A0A]">PostHog 產品分析</CardTitle>
                <CardDescription className="text-[#525252]">
                  PostHog 用於追蹤用戶行為、轉換漏斗和錯誤監控。填入以下資訊即可啟用。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* PostHog Project API Key */}
                <FormField
                  control={form.control}
                  name="posthogKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#0A0A0A]">
                        Project API Key
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#C41E3A] focus-visible:ring-[#C41E3A]/20"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription className="text-[#A3A3A3]">
                        在 PostHog 後臺 → Settings → Project → Project API Key 中找到，以 phc_ 開頭。這是用來收集前臺用戶行為數據的 Key。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* PostHog Host */}
                <FormField
                  control={form.control}
                  name="posthogHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#0A0A0A]">
                        PostHog Host
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://us.i.posthog.com"
                          className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#C41E3A] focus-visible:ring-[#C41E3A]/20"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription className="text-[#A3A3A3]">
                        PostHog 的 API 伺服器位址。PostHog Cloud 美國區使用 https://us.i.posthog.com，歐洲區使用 https://eu.i.posthog.com。如果是自架版本則填入你的伺服器網址。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* PostHog Personal API Key */}
                <FormField
                  control={form.control}
                  name="posthogPersonalApiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#0A0A0A]">
                        Personal API Key（選填）
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="phx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#C41E3A] focus-visible:ring-[#C41E3A]/20"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription className="text-[#A3A3A3]">
                        在 PostHog 後臺 → 右上角個人頭像 → Settings → Personal API Keys 中建立，以 phx_ 開頭。這是用來在後臺儀表板查詢分析數據（例如轉換漏斗）的進階功能，不填也可以正常追蹤用戶行為。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Meta Pixel / Conversions API */}
            <Card className="bg-white border border-[#E5E5E5] rounded-xl">
              <CardHeader>
                <CardTitle className="text-[#0A0A0A]">Meta Pixel / Conversions API</CardTitle>
                <CardDescription className="text-[#525252]">
                  Meta Pixel 用於追蹤網站訪客行為，Conversions API (CAPI) 提供伺服器端事件追蹤，提升歸因準確度。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="metaPixelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#0A0A0A]">
                        Meta Pixel ID
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123456789012345"
                          className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#C41E3A] focus-visible:ring-[#C41E3A]/20"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription className="text-[#A3A3A3]">
                        在 Meta Events Manager → 資料來源 → 你的 Pixel → 設定 中找到，為一串 15-16 位數字。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="metaCapiAccessToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#0A0A0A]">
                        Conversions API Access Token
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="EAAxxxxxxxxxxxxxxx..."
                          className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#C41E3A] focus-visible:ring-[#C41E3A]/20"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription className="text-[#A3A3A3]">
                        在 Meta Events Manager → 資料來源 → 你的 Pixel → 設定 → Conversions API → 產生存取權杖。用於伺服器端事件追蹤（Purchase、ViewContent），不填則僅使用瀏覽器端 Pixel。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* 儲存按鈕 */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-[#C41E3A] hover:bg-[#A01830] text-white rounded-full"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                儲存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                儲存設定
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
