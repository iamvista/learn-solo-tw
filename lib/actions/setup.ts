// lib/actions/setup.ts
// 系統初始化 Server Actions
// 類似 Ghost 的初始化機制：首次部署時引導用戶完成基本設定並設定管理員

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SETTING_KEYS } from "@/lib/validations/settings";
import { z } from "zod";

/**
 * 檢查系統是否需要初始化（是否有任何 ADMIN 角色用戶）
 * 此函數不需要任何權限，任何人都可以呼叫
 */
export async function checkNeedsSetup(): Promise<boolean> {
  const adminCount = await prisma.user.count({
    where: { role: "ADMIN" },
  });

  return adminCount === 0;
}

/**
 * 初始化表單驗證 Schema
 * 所有欄位都是可選的，用戶可以之後再到設定頁面補填
 */
const setupFormSchema = z.object({
  // 基本設定
  siteName: z.string().max(100).optional().or(z.literal("")),
  contactEmail: z
    .string()
    .email({ message: "請輸入有效的 Email 地址" })
    .optional()
    .or(z.literal("")),

  // 金流設定
  paymentGateway: z.union([z.literal("payuni"), z.literal("")]).optional(),
  payuniMerchantId: z.string().optional().or(z.literal("")),
  payuniHashKey: z.string().optional().or(z.literal("")),
  payuniHashIV: z.string().optional().or(z.literal("")),
  payuniTestMode: z.boolean().optional(),

  // 分析追蹤（像素）
  gaId: z.string().max(50).optional().or(z.literal("")),
  metaPixelId: z.string().max(50).optional().or(z.literal("")),
  metaCapiAccessToken: z.string().max(500).optional().or(z.literal("")),
});

export type SetupFormData = z.infer<typeof setupFormSchema>;

/**
 * 完成系統初始化
 * 1. 驗證系統確實需要初始化（無任何管理員）
 * 2. 驗證用戶已登入
 * 3. 將當前用戶設為 ADMIN
 * 4. 儲存用戶填寫的設定
 */
export async function completeSetup(
  data: SetupFormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. 確認用戶已登入
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "請先登入帳號" };
    }

    // 2. 驗證表單資料
    const validatedData = setupFormSchema.parse(data);

    // 3. 使用 transaction 確保原子性：檢查 admin 數量 + 提升角色在同一事務中
    const promoted = await prisma.$transaction(async (tx) => {
      const adminCount = await tx.user.count({
        where: { role: "ADMIN" },
      });

      if (adminCount > 0) {
        return false;
      }

      await tx.user.update({
        where: { id: session.user.id },
        data: { role: "ADMIN" },
      });

      return true;
    });

    if (!promoted) {
      return { success: false, error: "系統已初始化完成，無法重複執行" };
    }

    // 5. 儲存設定（只儲存有填寫的欄位）
    const settingsToSave: Array<{ key: string; value: string }> = [];

    if (validatedData.siteName) {
      settingsToSave.push({
        key: SETTING_KEYS.SITE_NAME,
        value: validatedData.siteName,
      });
    }
    if (validatedData.contactEmail) {
      settingsToSave.push({
        key: SETTING_KEYS.CONTACT_EMAIL,
        value: validatedData.contactEmail,
      });
    }

    // 金流設定
    const gateway = validatedData.paymentGateway;
    if (gateway === "payuni") {
      settingsToSave.push({
        key: SETTING_KEYS.PAYMENT_GATEWAY,
        value: gateway,
      });
    }
    if (validatedData.payuniMerchantId) {
      settingsToSave.push({
        key: SETTING_KEYS.PAYUNI_MERCHANT_ID,
        value: validatedData.payuniMerchantId,
      });
    }
    if (validatedData.payuniHashKey) {
      settingsToSave.push({
        key: SETTING_KEYS.PAYUNI_HASH_KEY,
        value: validatedData.payuniHashKey,
      });
    }
    if (validatedData.payuniHashIV) {
      settingsToSave.push({
        key: SETTING_KEYS.PAYUNI_HASH_IV,
        value: validatedData.payuniHashIV,
      });
    }
    if (validatedData.payuniTestMode !== undefined) {
      settingsToSave.push({
        key: SETTING_KEYS.PAYUNI_TEST_MODE,
        value: String(validatedData.payuniTestMode),
      });
    }

    // 分析追蹤
    if (validatedData.gaId) {
      settingsToSave.push({
        key: SETTING_KEYS.GA_ID,
        value: validatedData.gaId,
      });
    }
    if (validatedData.metaPixelId) {
      settingsToSave.push({
        key: SETTING_KEYS.META_PIXEL_ID,
        value: validatedData.metaPixelId,
      });
    }
    if (validatedData.metaCapiAccessToken) {
      settingsToSave.push({
        key: SETTING_KEYS.META_CAPI_ACCESS_TOKEN,
        value: validatedData.metaCapiAccessToken,
      });
    }

    // 批量寫入設定
    if (settingsToSave.length > 0) {
      await Promise.all(
        settingsToSave.map((s) =>
          prisma.siteSetting.upsert({
            where: { key: s.key },
            update: { value: s.value },
            create: { key: s.key, value: s.value },
          }),
        ),
      );
    }

    // 6. 記錄管理員操作日誌
    await prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        action: "UPDATE_SETTINGS",
        targetType: "System",
        details: {
          action: "complete_initial_setup",
          settingsCount: settingsToSave.length,
        },
      },
    });

    // 7. 清除快取
    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("系統初始化失敗:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "表單驗證失敗",
      };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "初始化時發生錯誤" };
  }
}
