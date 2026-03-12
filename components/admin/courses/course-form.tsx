// components/admin/courses/course-form.tsx
// 課程表單元件
// 支援新增和編輯模式

'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import type { Course } from '@prisma/client'
import {
  courseSchema,
  type CourseFormData,
  courseStatusOptions,
  generateSlug,
} from '@/lib/validations/course'
import { createCourse, updateCourse } from '@/lib/actions/courses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2, Save, Image as ImageIcon, Trash2, RefreshCw, Clock, Globe, FileCode, User, Mail } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ImageUpload } from '@/components/admin/media/image-upload'

interface CourseFormProps {
  course?: Course
  mode: 'create' | 'edit'
}

export function CourseForm({ course, mode }: CourseFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [imagePreview, setImagePreview] = useState<string | null>(
    course?.coverImage ?? null
  )

  // 初始化表單
  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: course?.title ?? '',
      subtitle: course?.subtitle ?? '',
      slug: course?.slug ?? '',
      description: course?.description ?? '',
      coverImage: course?.coverImage ?? '',
      price: course?.price ?? 0,
      salePrice: course?.salePrice ?? undefined,
      saleEndAt: course?.saleEndAt ? new Date(course.saleEndAt) : undefined,
      saleLabel: course?.saleLabel ?? '',
      saleCycleEnabled: course?.saleCycleEnabled ?? false,
      saleCycleDays: course?.saleCycleDays ?? undefined,
      showCountdown: course?.showCountdown ?? true,
      seoTitle: course?.seoTitle ?? '',
      seoDesc: course?.seoDesc ?? '',
      seoKeywords: course?.seoKeywords ?? '',
      ogDescription: course?.ogDescription ?? '',
      ogImage: course?.ogImage ?? '',
      landingPageMode: course?.landingPageMode as 'react' | 'html' | undefined ?? undefined,
      landingPageSlug: course?.landingPageSlug ?? '',
      landingPageHtml: course?.landingPageHtml ?? '',
      notifyAdminOnPurchase: course?.notifyAdminOnPurchase ?? false,
      instructorName: course?.instructorName ?? '',
      instructorTitle: course?.instructorTitle ?? '',
      instructorDesc: course?.instructorDesc ?? '',
      status: course?.status ?? 'DRAFT',
    },
  })

  // 監聽標題變化，自動產生 Slug（僅新增模式）
  const watchTitle = form.watch('title')
  useEffect(() => {
    if (mode === 'create' && watchTitle && !form.getValues('slug')) {
      const slug = generateSlug(watchTitle)
      if (slug) {
        form.setValue('slug', slug)
      }
    }
  }, [watchTitle, mode, form])

  // 監聽封面圖片變化
  const watchCoverImage = form.watch('coverImage')
  useEffect(() => {
    if (watchCoverImage) {
      setImagePreview(watchCoverImage)
    } else {
      setImagePreview(null)
    }
  }, [watchCoverImage])

  // 提交表單
  async function onSubmit(data: CourseFormData) {
    startTransition(async () => {
      try {
        if (mode === 'create') {
          const result = await createCourse(data)

          if (result.success) {
            toast.success('課程建立成功')
            router.push('/admin/courses')
          } else {
            toast.error(result.error ?? '建立課程失敗')
          }
        } else {
          if (!course?.id) return

          const result = await updateCourse(course.id, data)

          if (result.success) {
            toast.success('課程更新成功')
            router.push('/admin/courses')
          } else {
            toast.error(result.error ?? '更新課程失敗')
          }
        }
      } catch {
        toast.error('操作失敗，請稍後再試')
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 基本資訊 */}
        <Card className="bg-white border-[#E5E5E5] rounded-xl">
          <CardHeader>
            <CardTitle className="text-[#0A0A0A]">基本資訊</CardTitle>
            <CardDescription className="text-[#525252]">
              設定課程的基本資訊
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 標題 */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#0A0A0A]">
                    課程標題 <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="輸入課程標題"
                      className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 副標題 */}
            <FormField
              control={form.control}
              name="subtitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#0A0A0A]">副標題</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="輸入課程副標題（選填）"
                      className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Slug */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#0A0A0A]">
                    Slug <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="course-slug"
                      className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-[#A3A3A3]">
                    課程網址的識別碼，只能包含小寫字母、數字和連字號
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 描述 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#0A0A0A]">課程描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="輸入課程描述..."
                      className="min-h-32 bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 狀態 */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#0A0A0A]">
                    課程狀態 <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white border-[#E5E5E5] text-[#0A0A0A] rounded-lg">
                        <SelectValue placeholder="選擇狀態" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white border-[#E5E5E5] rounded-lg">
                      {courseStatusOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-[#0A0A0A] focus:bg-[#FAFAFA] focus:text-[#0A0A0A]"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="bg-[#E5E5E5]" />

            {/* 講師資訊 */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#0A0A0A] flex items-center gap-2">
                <User className="h-4 w-4 text-[#C41E3A]" />
                講師資訊
              </h3>
              <p className="text-xs text-[#A3A3A3]">
                設定講師的公開顯示資訊，同時也會用於搜尋引擎結構化資料
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="instructorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#0A0A0A]">講師名稱</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例如：講師姓名"
                        className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructorTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#0A0A0A]">講師職稱</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例如：全端工程師"
                        className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="instructorDesc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#0A0A0A]">講師簡介</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="講師的簡短介紹"
                      className="min-h-20 bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 封面圖片 */}
        <Card className="bg-white border-[#E5E5E5] rounded-xl">
          <CardHeader>
            <CardTitle className="text-[#0A0A0A]">封面圖片</CardTitle>
            <CardDescription className="text-[#525252]">
              設定課程的封面圖片
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {imagePreview ? (
              <div className="space-y-4">
                <p className="text-sm text-[#525252]">目前封面圖片</p>
                <div className="relative w-full max-w-md aspect-video rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="封面預覽"
                    className="w-full h-full object-cover"
                    onError={() => setImagePreview(null)}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => {
                        form.setValue('coverImage', '')
                        setImagePreview(null)
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      移除圖片
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-[#A3A3A3]">
                  將滑鼠移到圖片上可移除，或上傳新圖片以取代
                </p>
                <ImageUpload
                  onUploadComplete={(media) => {
                    form.setValue('coverImage', media.url)
                    setImagePreview(media.url)
                  }}
                  onError={(error) => toast.error(error)}
                  multiple={false}
                  maxSize={10}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <ImageUpload
                  onUploadComplete={(media) => {
                    form.setValue('coverImage', media.url)
                    setImagePreview(media.url)
                  }}
                  onError={(error) => toast.error(error)}
                  multiple={false}
                  maxSize={10}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 定價 */}
        <Card className="bg-white border-[#E5E5E5] rounded-xl">
          <CardHeader>
            <CardTitle className="text-[#0A0A0A]">定價設定</CardTitle>
            <CardDescription className="text-[#525252]">
              設定課程的價格和促銷活動
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 原價 */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#0A0A0A]">
                      原價 (NT$) <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 促銷價 */}
              <FormField
                control={form.control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#0A0A0A]">
                      促銷價 (NT$)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="選填"
                        className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription className="text-[#A3A3A3]">
                      促銷價必須小於原價
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 促銷說明文字 */}
            <FormField
              control={form.control}
              name="saleLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#0A0A0A]">促銷說明文字</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例如：開工優惠、限時早鳥"
                      className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription className="text-[#A3A3A3]">
                    顯示在價格旁的促銷理由，未填寫時預設為「限時優惠」
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 永久優惠 */}
            <FormField
              control={form.control}
              name="saleCycleEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#E5E5E5] p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-[#0A0A0A] flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-[#C41E3A]" />
                      永久優惠
                    </FormLabel>
                    <FormDescription className="text-[#A3A3A3]">
                      啟用後，促銷價將永久生效，不受截止日期限制
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked)
                        // 開啟永久優惠時，倒數時鐘預設關閉
                        if (checked) {
                          form.setValue('showCountdown', false)
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* 永久優惠開啟時：顯示倒數時鐘選項 */}
            {form.watch('saleCycleEnabled') && (
              <>
                <FormField
                  control={form.control}
                  name="showCountdown"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#E5E5E5] p-4 ml-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-[#0A0A0A] flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#C41E3A]" />
                          顯示倒數時鐘
                        </FormLabel>
                        <FormDescription className="text-[#A3A3A3]">
                          開啟後，前台銷售頁將顯示優惠倒數計時器
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* 倒數時鐘開啟時：顯示循環天數 */}
                {form.watch('showCountdown') && (
                  <FormField
                    control={form.control}
                    name="saleCycleDays"
                    render={({ field }) => (
                      <FormItem className="ml-4">
                        <FormLabel className="text-[#0A0A0A]">循環天數</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              max="30"
                              placeholder="3"
                              className="w-32 bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseInt(e.target.value) : null
                                )
                              }
                            />
                            <span className="text-sm text-[#525252]">天</span>
                          </div>
                        </FormControl>
                        <FormDescription className="text-[#A3A3A3]">
                          倒數歸零後自動重新開始計時
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            {/* 永久優惠關閉時：顯示倒數時鐘開關和促銷截止日期 */}
            {!form.watch('saleCycleEnabled') && (
              <>
                <FormField
                  control={form.control}
                  name="showCountdown"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#E5E5E5] p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-[#0A0A0A] flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#C41E3A]" />
                          顯示倒數時鐘
                        </FormLabel>
                        <FormDescription className="text-[#A3A3A3]">
                          關閉後，前台銷售頁將不會顯示優惠倒數計時器，但促銷價格仍然有效
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="saleEndAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#0A0A0A]">促銷截止日期</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          className="bg-white border-[#E5E5E5] text-[#0A0A0A] rounded-lg"
                          value={
                            field.value
                              ? format(new Date(field.value), "yyyy-MM-dd'T'HH:mm")
                              : ''
                          }
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? new Date(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription className="text-[#A3A3A3]">
                        促銷活動的結束時間
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* SEO 設定 */}
        <Card className="bg-white border-[#E5E5E5] rounded-xl">
          <CardHeader>
            <CardTitle className="text-[#0A0A0A]">SEO 設定</CardTitle>
            <CardDescription className="text-[#525252]">
              優化搜尋引擎的顯示效果
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SEO 標題 */}
            <FormField
              control={form.control}
              name="seoTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#0A0A0A]">SEO 標題</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="搜尋結果顯示的標題"
                      className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription className="text-[#A3A3A3]">
                    建議 60 字元以內
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SEO 描述 */}
            <FormField
              control={form.control}
              name="seoDesc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#0A0A0A]">SEO 描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="搜尋結果顯示的描述文字"
                      className="min-h-20 bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription className="text-[#A3A3A3]">
                    建議 160 字元以內
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SEO 關鍵字 */}
            <FormField
              control={form.control}
              name="seoKeywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#0A0A0A]">SEO 關鍵字</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="關鍵字1, 關鍵字2, 關鍵字3"
                      className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription className="text-[#A3A3A3]">
                    以逗號分隔多個關鍵字
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* OG / Social 設定 */}
        <Card className="bg-white border-[#E5E5E5] rounded-xl">
          <CardHeader>
            <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
              <Globe className="h-5 w-5 text-[#C41E3A]" />
              OG / Social 設定
            </CardTitle>
            <CardDescription className="text-[#525252]">
              社群分享時的顯示內容（與 SEO 分開管理）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="ogDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#0A0A0A]">OG 描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="社群分享時顯示的描述（未填寫則使用 SEO 描述）"
                      className="min-h-20 bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription className="text-[#A3A3A3]">
                    建議 300 字元以內，未填寫時自動使用 SEO 描述
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ogImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#0A0A0A]">OG 圖片</FormLabel>
                  {field.value ? (
                    <div className="space-y-3">
                      <div className="relative w-full max-w-md aspect-1200/630 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] overflow-hidden group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={field.value}
                          alt="OG 圖片預覽"
                          className="w-full h-full object-cover"
                          onError={() => field.onChange('')}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => field.onChange('')}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            移除圖片
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-[#A3A3A3]">
                        將滑鼠移到圖片上可移除，或上傳新圖片以取代
                      </p>
                      <ImageUpload
                        onUploadComplete={(media) => field.onChange(media.url)}
                        onError={(error) => toast.error(error)}
                        multiple={false}
                        maxSize={10}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <ImageUpload
                        onUploadComplete={(media) => field.onChange(media.url)}
                        onError={(error) => toast.error(error)}
                        multiple={false}
                        maxSize={10}
                      />
                    </div>
                  )}
                  <FormDescription className="text-[#A3A3A3]">
                    建議尺寸 1200x630，未上傳時自動使用封面圖片
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 銷售頁設定 */}
        <Card className="bg-white border-[#E5E5E5] rounded-xl">
          <CardHeader>
            <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
              <FileCode className="h-5 w-5 text-[#C41E3A]" />
              銷售頁設定
            </CardTitle>
            <CardDescription className="text-[#525252]">
              設定課程銷售頁的渲染模式
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="landingPageMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#0A0A0A]">銷售頁模式</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value ?? 'react'}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex items-center space-x-2 rounded-lg border border-[#E5E5E5] p-3">
                        <RadioGroupItem value="react" id="mode-react" />
                        <Label htmlFor="mode-react" className="flex-1 cursor-pointer">
                          <div className="font-medium text-[#0A0A0A]">React 元件</div>
                          <div className="text-sm text-[#A3A3A3]">
                            使用預先開發的 React 元件作為銷售頁，最大化設計彈性
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 rounded-lg border border-[#E5E5E5] p-3">
                        <RadioGroupItem value="html" id="mode-html" />
                        <Label htmlFor="mode-html" className="flex-1 cursor-pointer">
                          <div className="font-medium text-[#0A0A0A]">自訂 HTML</div>
                          <div className="text-sm text-[#A3A3A3]">
                            直接貼入 HTML 內容，適合快速上線或外部設計稿
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(form.watch('landingPageMode') ?? 'react') === 'react' ? (
              <FormField
                control={form.control}
                name="landingPageSlug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#0A0A0A]">銷售頁元件 Slug</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例如：ios-vibe-coding（未填寫則使用課程 Slug）"
                        className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription className="text-[#A3A3A3]">
                      你可以直接跟 AI 說「替 <span className="font-mono font-medium text-[#525252]">{form.watch('slug') || 'your-course-slug'}</span> 課程建立一個專屬銷售頁」，未填寫則使用課程 Slug
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="landingPageHtml"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#0A0A0A]">HTML 內容</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="貼入完整的 HTML 銷售頁內容..."
                        className="min-h-64 bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg font-mono text-sm"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription className="text-[#A3A3A3]">
                      支援完整 HTML，會在伺服器端渲染（SSR），保證 SEO
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* 購買通知 */}
        <Card className="bg-white border-[#E5E5E5] rounded-xl">
          <CardHeader>
            <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#C41E3A]" />
              購買通知
            </CardTitle>
            <CardDescription className="text-[#525252]">
              設定用戶購買此課程後是否通知管理員
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notifyAdminOnPurchase"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#E5E5E5] p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-[#0A0A0A]">
                      購買成功 Email 通知
                    </FormLabel>
                    <FormDescription className="text-[#A3A3A3]">
                      啟用後，每當有用戶成功購買此課程，系統會發送 Email 通知所有管理員
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Separator className="bg-[#E5E5E5]" />

        {/* 操作按鈕 */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
          >
            取消
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-[#C41E3A] hover:bg-[#A01830] text-white rounded-full"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                處理中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {mode === 'create' ? '建立課程' : '儲存變更'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
