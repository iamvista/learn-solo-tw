// lib/validations/checkout.ts
// 結帳流程相關的 Zod 驗證 Schema

import { z } from 'zod'

/**
 * 建立訂單請求 Schema
 */
export const createOrderSchema = z.object({
  courseId: z.string().min(1, '課程 ID 為必填'),
  email: z.string().email('請輸入有效的電子郵件').optional(),
  name: z.string().trim().max(50, '姓名不能超過 50 個字元').optional(),
})

export type CreateOrderData = z.infer<typeof createOrderSchema>
