// lib/validations/course.ts
// 課程驗證規則
// 使用 Zod 進行表單驗證

import { z } from 'zod'

/**
 * 課程狀態選項
 */
export const courseStatusOptions = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'PUBLISHED', label: '已發佈' },
  { value: 'UNLISTED', label: '隱藏' },
] as const

/**
 * 課程基礎 Schema
 */
export const courseSchema = z.object({
  // 標題：必填，2-100 字元
  title: z
    .string()
    .min(2, { message: '標題至少需要 2 個字元' })
    .max(100, { message: '標題不能超過 100 個字元' }),

  // 副標題：選填
  subtitle: z
    .string()
    .max(200, { message: '副標題不能超過 200 個字元' })
    .optional()
    .nullable(),

  // Slug：必填，URL 安全格式
  slug: z
    .string()
    .min(2, { message: 'Slug 至少需要 2 個字元' })
    .max(100, { message: 'Slug 不能超過 100 個字元' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'Slug 只能包含小寫字母、數字和連字號',
    }),

  // 描述：選填
  description: z
    .string()
    .max(5000, { message: '描述不能超過 5000 個字元' })
    .optional()
    .nullable(),

  // 封面圖片：選填
  coverImage: z
    .string()
    .url({ message: '請輸入有效的圖片網址' })
    .optional()
    .nullable()
    .or(z.literal('')),

  // 原價：必填，正整數
  price: z
    .number()
    .int({ message: '價格必須為整數' })
    .min(0, { message: '價格不能為負數' }),

  // 促銷價：選填，需小於原價
  salePrice: z
    .number()
    .int({ message: '促銷價必須為整數' })
    .min(0, { message: '促銷價不能為負數' })
    .optional()
    .nullable(),

  // 促銷截止日期：選填
  saleEndAt: z
    .date()
    .optional()
    .nullable(),

  // 促銷說明文字：選填（如「開工優惠」「限時早鳥」）
  saleLabel: z
    .string()
    .max(20, { message: '促銷說明文字不能超過 20 個字元' })
    .optional()
    .nullable(),

  // 永久促銷循環：選填
  saleCycleEnabled: z
    .boolean()
    .optional(),

  // 循環天數：選填
  saleCycleDays: z
    .number()
    .int({ message: '循環天數必須為整數' })
    .min(1, { message: '循環天數至少為 1 天' })
    .max(30, { message: '循環天數不能超過 30 天' })
    .optional()
    .nullable(),

  // 是否顯示倒數時鐘：選填
  showCountdown: z
    .boolean()
    .optional(),

  // SEO 標題：選填
  seoTitle: z
    .string()
    .max(60, { message: 'SEO 標題不能超過 60 個字元' })
    .optional()
    .nullable(),

  // SEO 描述：選填
  seoDesc: z
    .string()
    .max(160, { message: 'SEO 描述不能超過 160 個字元' })
    .optional()
    .nullable(),

  // SEO 關鍵字：選填
  seoKeywords: z
    .string()
    .max(200, { message: 'SEO 關鍵字不能超過 200 個字元' })
    .optional()
    .nullable(),

  // OG / Social
  ogDescription: z
    .string()
    .max(300, { message: 'OG 描述不能超過 300 個字元' })
    .optional()
    .nullable(),

  ogImage: z
    .string()
    .url({ message: '請輸入有效的圖片網址' })
    .optional()
    .nullable()
    .or(z.literal('')),

  // 銷售頁設定
  landingPageMode: z
    .enum(['react', 'html'])
    .optional()
    .nullable(),

  landingPageSlug: z
    .string()
    .max(100, { message: '銷售頁 Slug 不能超過 100 個字元' })
    .optional()
    .nullable(),

  landingPageHtml: z
    .string()
    .optional()
    .nullable(),

  // JSON-LD 結構化資料
  instructorName: z
    .string()
    .max(100, { message: '講師名稱不能超過 100 個字元' })
    .optional()
    .nullable(),

  instructorTitle: z
    .string()
    .max(100, { message: '講師職稱不能超過 100 個字元' })
    .optional()
    .nullable(),

  instructorDesc: z
    .string()
    .max(500, { message: '講師簡介不能超過 500 個字元' })
    .optional()
    .nullable(),

  courseWorkload: z
    .string()
    .max(20, { message: '課程時長格式不能超過 20 個字元' })
    .optional()
    .nullable(),

  ratingValue: z
    .string()
    .max(5, { message: '評分值不能超過 5 個字元' })
    .optional()
    .nullable(),

  ratingCount: z
    .string()
    .max(10, { message: '評分數量不能超過 10 個字元' })
    .optional()
    .nullable(),

  // 購買通知
  notifyAdminOnPurchase: z
    .boolean()
    .optional(),

  // 狀態：必填
  status: z.enum(['DRAFT', 'PUBLISHED', 'UNLISTED'], {
    message: '請選擇有效的狀態',
  }),
}).refine(
  (data) => {
    // 如果有促銷價，必須小於原價
    if (data.salePrice !== null && data.salePrice !== undefined) {
      return data.salePrice < data.price
    }
    return true
  },
  {
    message: '促銷價必須小於原價',
    path: ['salePrice'],
  }
).refine(
  (data) => {
    // 如果有促銷價，應該要有促銷截止日期
    if (data.salePrice !== null && data.salePrice !== undefined && data.salePrice > 0) {
      // 這是建議性的，不強制要求
      return true
    }
    return true
  },
  {
    message: '建議設定促銷截止日期',
    path: ['saleEndAt'],
  }
).refine(
  (data) => {
    // 循環模式下不檢查促銷截止日期
    if (data.saleCycleEnabled) return true
    // 如果有促銷截止日期，必須晚於現在
    if (data.saleEndAt !== null && data.saleEndAt !== undefined) {
      return data.saleEndAt > new Date()
    }
    return true
  },
  {
    message: '促銷截止日期必須晚於現在',
    path: ['saleEndAt'],
  }
).refine(
  (data) => {
    // 啟用永久優惠 + 顯示倒數時鐘時，必須設定循環天數
    if (data.saleCycleEnabled && data.showCountdown) {
      return data.saleCycleDays !== null && data.saleCycleDays !== undefined && data.saleCycleDays >= 1
    }
    return true
  },
  {
    message: '開啟倒數時鐘時，必須設定循環天數',
    path: ['saleCycleDays'],
  }
).refine(
  (data) => {
    // 啟用永久優惠時，必須設定促銷價
    if (data.saleCycleEnabled) {
      return data.salePrice !== null && data.salePrice !== undefined
    }
    return true
  },
  {
    message: '啟用永久優惠時，必須設定促銷價',
    path: ['salePrice'],
  }
)

/**
 * 課程表單輸入類型
 */
export type CourseFormData = z.infer<typeof courseSchema>

/**
 * 從標題產生 Slug
 * @param title 課程標題
 * @returns URL 安全的 Slug
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // 將中文轉換為拼音或移除（這裡簡單處理，僅保留英數字）
    .replace(/[^\w\s-]/g, '')
    // 將空格轉換為連字號
    .replace(/\s+/g, '-')
    // 移除連續的連字號
    .replace(/-+/g, '-')
    // 移除開頭和結尾的連字號
    .replace(/^-+|-+$/g, '')
    // 如果為空，使用時間戳
    || `course-${Date.now()}`
}

/**
 * 課程搜尋參數 Schema
 */
export const courseSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'UNLISTED', 'ALL']).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
})

export type CourseSearchParams = z.infer<typeof courseSearchSchema>
