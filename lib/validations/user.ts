// lib/validations/user.ts
// 用戶相關驗證規則
// 使用 Zod 進行表單驗證

import { z } from "zod";

/**
 * 用戶角色選項
 */
export const userRoleOptions = [
  { value: "USER", label: "學員" },
  { value: "EDITOR", label: "編輯者" },
  { value: "ADMIN", label: "管理員" },
] as const;

/**
 * 用戶搜尋參數 Schema
 */
export const userSearchSchema = z.object({
  search: z.string().optional(),
  hasPurchase: z.enum(["all", "yes", "no"]).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export type UserSearchParams = z.infer<typeof userSearchSchema>;

/**
 * 授權課程存取 Schema
 */
export const grantAccessSchema = z.object({
  userId: z.string().min(1, { message: "用戶 ID 必填" }),
  courseId: z.string().min(1, { message: "課程 ID 必填" }),
  expiresAt: z.date().optional().nullable(),
});

export type GrantAccessData = z.infer<typeof grantAccessSchema>;

/**
 * 撤銷課程存取 Schema
 */
export const revokeAccessSchema = z.object({
  userId: z.string().min(1, { message: "用戶 ID 必填" }),
  courseId: z.string().min(1, { message: "課程 ID 必填" }),
});

export type RevokeAccessData = z.infer<typeof revokeAccessSchema>;

/**
 * 更新用戶角色 Schema
 */
export const updateRoleSchema = z.object({
  userId: z.string().min(1, { message: "用戶 ID 必填" }),
  role: z.enum(["USER", "EDITOR", "ADMIN"], {
    message: "請選擇有效的角色",
  }),
});

export type UpdateRoleData = z.infer<typeof updateRoleSchema>;

/**
 * 編輯學員資料 Schema
 */
export const updateUserSchema = z.object({
  userId: z.string().min(1, { message: "用戶 ID 必填" }),
  name: z
    .string()
    .min(1, { message: "姓名不可為空" })
    .max(100, { message: "姓名過長" }),
  email: z.string().email({ message: "請輸入有效的電子郵件" }),
  phone: z.string().max(20, { message: "電話號碼過長" }).optional().nullable(),
});

export type UpdateUserData = z.infer<typeof updateUserSchema>;

/**
 * 刪除學員 Schema
 */
export const deleteUserSchema = z.object({
  userId: z.string().min(1, { message: "用戶 ID 必填" }),
});

export type DeleteUserData = z.infer<typeof deleteUserSchema>;

/**
 * 更新管理員備註 Schema
 */
export const updateAdminNotesSchema = z.object({
  userId: z.string().min(1, { message: "用戶 ID 必填" }),
  adminNotes: z
    .string()
    .max(5000, { message: "備註不可超過 5000 字" })
    .optional()
    .nullable(),
});

export type UpdateAdminNotesData = z.infer<typeof updateAdminNotesSchema>;

/**
 * 批次匯入學員的單筆資料 Schema
 */
export const importStudentRowSchema = z.object({
  name: z.string().min(1, { message: "姓名必填" }),
  email: z.string().email({ message: "請輸入有效的 Email" }),
  phone: z.string().optional(),
});

export type ImportStudentRow = z.infer<typeof importStudentRowSchema>;

/**
 * 批次匯入學員 Schema
 */
export const importStudentsSchema = z.object({
  students: z
    .array(importStudentRowSchema)
    .min(1, { message: "至少需要一筆學員資料" })
    .max(1000, { message: "每次最多匯入 1,000 筆" }),
  courseId: z.string().min(1, { message: "請選擇課程" }),
});

export type ImportStudentsData = z.infer<typeof importStudentsSchema>;
