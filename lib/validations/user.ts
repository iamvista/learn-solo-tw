// lib/validations/user.ts
// 用戶相關驗證規則
// 使用 Zod 進行表單驗證

import { z } from 'zod'

/**
 * 用戶角色選項
 */
export const userRoleOptions = [
  { value: 'USER', label: '學員' },
  { value: 'EDITOR', label: '編輯者' },
  { value: 'ADMIN', label: '管理員' },
] as const

/**
 * 用戶搜尋參數 Schema
 */
export const userSearchSchema = z.object({
  search: z.string().optional(),
  hasPurchase: z.enum(['all', 'yes', 'no']).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
})

export type UserSearchParams = z.infer<typeof userSearchSchema>

/**
 * 授權課程存取 Schema
 */
export const grantAccessSchema = z.object({
  userId: z.string().min(1, { message: '用戶 ID 必填' }),
  courseId: z.string().min(1, { message: '課程 ID 必填' }),
  expiresAt: z.date().optional().nullable(),
})

export type GrantAccessData = z.infer<typeof grantAccessSchema>

/**
 * 撤銷課程存取 Schema
 */
export const revokeAccessSchema = z.object({
  userId: z.string().min(1, { message: '用戶 ID 必填' }),
  courseId: z.string().min(1, { message: '課程 ID 必填' }),
})

export type RevokeAccessData = z.infer<typeof revokeAccessSchema>

/**
 * 更新用戶角色 Schema
 */
export const updateRoleSchema = z.object({
  userId: z.string().min(1, { message: '用戶 ID 必填' }),
  role: z.enum(['USER', 'EDITOR', 'ADMIN'], {
    message: '請選擇有效的角色',
  }),
})

export type UpdateRoleData = z.infer<typeof updateRoleSchema>
