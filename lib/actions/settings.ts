// lib/actions/settings.ts
// 系統設定 Server Actions
// 提供設定 CRUD 操作

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOnlyAdminAuth } from "@/lib/require-admin";
import { getAppUrl } from "@/lib/app-url";
import {
  siteSettingsSchema,
  emailSettingsSchema,
  layoutSettingsSchema,
  legalMarkdownSchema,
  SETTING_KEYS,
  type SiteSettingsFormData,
  type EmailSettingsFormData,
  type LayoutSettingsFormData,
} from "@/lib/validations/settings";

// requireOnlyAdminAuth 從 @/lib/require-admin 引入（直接查 DB 確保角色即時生效）
// settings.ts 的所有操作僅限 ADMIN（不含 EDITOR）

/**
 * 記錄管理員操作日誌
 */
async function logAdminAction(
  adminId: string,
  details?: Record<string, unknown>,
) {
  try {
    await prisma.adminLog.create({
      data: {
        adminId,
        action: "UPDATE_SETTINGS",
        targetType: "SiteSetting",
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      },
    });
  } catch (error) {
    console.error("記錄操作日誌失敗:", error);
  }
}

/**
 * 取得所有設定
 */
/**
 * 需要遮蔽的敏感設定 key 列表
 */
const SENSITIVE_SETTING_KEYS: Set<string> = new Set([
  SETTING_KEYS.POSTHOG_PERSONAL_API_KEY,
  SETTING_KEYS.META_CAPI_ACCESS_TOKEN,
]);

/**
 * 遮蔽敏感值，只保留前後幾個字元
 */
function maskSecret(value: string): string {
  if (!value || value.length < 8) return value ? "••••••••" : "";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export async function getSiteSettings(): Promise<Record<string, string>> {
  await requireOnlyAdminAuth();

  const settings = await prisma.siteSetting.findMany();

  const result: Record<string, string> = {};
  for (const setting of settings) {
    if (SENSITIVE_SETTING_KEYS.has(setting.key)) {
      result[setting.key] = maskSecret(setting.value);
    } else {
      result[setting.key] = setting.value;
    }
  }

  return result;
}

/**
 * 取得單一設定
 */
export async function getSettingByKey(key: string): Promise<string | null> {
  await requireOnlyAdminAuth();

  const setting = await prisma.siteSetting.findUnique({
    where: { key },
  });

  return setting?.value ?? null;
}

/**
 * 更新或建立設定
 */
async function upsertSetting(key: string, value: string): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/**
 * 更新站點設定
 */
export async function updateSiteSettings(
  data: SiteSettingsFormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireOnlyAdminAuth();

    // 驗證資料
    const validatedData = siteSettingsSchema.parse(data);

    // 更新設定
    await Promise.all([
      upsertSetting(SETTING_KEYS.SITE_NAME, validatedData.siteName),
      upsertSetting(SETTING_KEYS.SITE_LOGO, validatedData.siteLogo || ""),
      upsertSetting(
        SETTING_KEYS.CONTACT_EMAIL,
        validatedData.contactEmail || "",
      ),
      upsertSetting(
        SETTING_KEYS.BRAND_DISPLAY_NAME,
        validatedData.brandDisplayName || "",
      ),
      upsertSetting(
        SETTING_KEYS.BRAND_SUBTITLE,
        validatedData.brandSubtitle || "",
      ),
      upsertSetting(SETTING_KEYS.GA_ID, validatedData.gaId || ""),
      upsertSetting(SETTING_KEYS.POSTHOG_KEY, validatedData.posthogKey || ""),
      upsertSetting(SETTING_KEYS.POSTHOG_HOST, validatedData.posthogHost || ""),
      // 敏感欄位：只有在使用者實際輸入新值時才更新（遮蔽值含 '...' 不存回）
      ...(validatedData.posthogPersonalApiKey &&
      !validatedData.posthogPersonalApiKey.includes("...")
        ? [
            upsertSetting(
              SETTING_KEYS.POSTHOG_PERSONAL_API_KEY,
              validatedData.posthogPersonalApiKey,
            ),
          ]
        : []),
      upsertSetting(
        SETTING_KEYS.META_PIXEL_ID,
        validatedData.metaPixelId || "",
      ),
      ...(validatedData.metaCapiAccessToken &&
      !validatedData.metaCapiAccessToken.includes("...")
        ? [
            upsertSetting(
              SETTING_KEYS.META_CAPI_ACCESS_TOKEN,
              validatedData.metaCapiAccessToken,
            ),
          ]
        : []),
    ]);

    // 記錄操作日誌（遮蔽敏感欄位，不記錄原始秘鑰）
    const safeLogData = { ...validatedData } as Record<string, unknown>;
    const sensitiveFields = ["posthogPersonalApiKey", "metaCapiAccessToken"];
    for (const field of sensitiveFields) {
      if (safeLogData[field] && typeof safeLogData[field] === "string") {
        safeLogData[field] = "[REDACTED]";
      }
    }
    await logAdminAction(user.id as string, {
      action: "update_site_settings",
      settings: safeLogData,
    });

    // 重新驗證頁面快取
    revalidatePath("/admin/settings");

    return { success: true };
  } catch (error) {
    console.error("更新站點設定失敗:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "更新設定時發生錯誤" };
  }
}

/**
 * 更新 Email 設定
 */
export async function updateEmailSettings(
  data: EmailSettingsFormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireOnlyAdminAuth();

    // 驗證資料
    const validatedData = emailSettingsSchema.parse(data);

    // 更新設定
    await Promise.all([
      upsertSetting(
        SETTING_KEYS.EMAIL_SENDER_NAME,
        validatedData.emailSenderName,
      ),
      ...(validatedData.emailFrom !== undefined
        ? [
            upsertSetting(
              SETTING_KEYS.EMAIL_FROM,
              validatedData.emailFrom || "",
            ),
          ]
        : []),
    ]);

    // 記錄操作日誌
    await logAdminAction(user.id as string, {
      action: "update_email_settings",
      settings: {
        emailSenderName: validatedData.emailSenderName,
        emailFrom: validatedData.emailFrom,
      },
    });

    // 重新驗證頁面快取
    revalidatePath("/admin/settings/email");

    return { success: true };
  } catch (error) {
    console.error("更新 Email 設定失敗:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "更新設定時發生錯誤" };
  }
}

/**
 * 取得金流設定（含 DB 值，遮罩敏感資料）
 */
export async function getPaymentSettings(): Promise<{
  payuni: {
    merchantId: string;
    hashKeyHint: string;
    hashIVHint: string;
    testMode: boolean;
    returnUrl: string;
    notifyUrl: string;
    isConfigured: boolean;
  };
}> {
  await requireOnlyAdminAuth();

  const { getPaymentGatewaySettings } =
    await import("@/lib/payment/gateway-factory");
  const settings = await getPaymentGatewaySettings();
  const appUrl = getAppUrl();

  const payuniHashKey = settings.payuni.hashKey;
  const payuniHashKeyHint = payuniHashKey
    ? `${"•".repeat(Math.max(0, payuniHashKey.length - 4))}${payuniHashKey.slice(-4)}`
    : "";
  const payuniHashIV = settings.payuni.hashIV;
  const payuniHashIVHint = payuniHashIV
    ? `${"•".repeat(Math.max(0, payuniHashIV.length - 4))}${payuniHashIV.slice(-4)}`
    : "";

  return {
    payuni: {
      merchantId: settings.payuni.merchantId,
      hashKeyHint: payuniHashKeyHint,
      hashIVHint: payuniHashIVHint,
      testMode: settings.payuni.testMode,
      returnUrl: `${appUrl}/api/payment/return`,
      notifyUrl: `${appUrl}/api/payment/notify`,
      isConfigured: !!(
        settings.payuni.merchantId &&
        settings.payuni.hashKey &&
        settings.payuni.hashIV
      ),
    },
  };
}

/**
 * 更新金流設定
 */
export async function updatePaymentSettings(data: {
  payuniMerchantId?: string;
  payuniHashKey?: string;
  payuniHashIV?: string;
  payuniTestMode?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireOnlyAdminAuth();

    // 基本驗證（不使用 refine，因為已設定時允許秘鑰為空）
    const { z } = await import("zod");
    const baseSchema = z.object({
      payuniMerchantId: z.string().optional().or(z.literal("")),
      payuniHashKey: z.string().optional().or(z.literal("")),
      payuniHashIV: z.string().optional().or(z.literal("")),
      payuniTestMode: z.boolean().default(true),
    });
    const validatedData = baseSchema.parse(data);

    // 儲存所有設定（空值表示不更改）
    await Promise.all([
      upsertSetting(SETTING_KEYS.PAYMENT_GATEWAY, "payuni"),
      ...(validatedData.payuniMerchantId
        ? [
            upsertSetting(
              SETTING_KEYS.PAYUNI_MERCHANT_ID,
              validatedData.payuniMerchantId,
            ),
          ]
        : []),
      ...(validatedData.payuniHashKey
        ? [
            upsertSetting(
              SETTING_KEYS.PAYUNI_HASH_KEY,
              validatedData.payuniHashKey,
            ),
          ]
        : []),
      ...(validatedData.payuniHashIV
        ? [
            upsertSetting(
              SETTING_KEYS.PAYUNI_HASH_IV,
              validatedData.payuniHashIV,
            ),
          ]
        : []),
      upsertSetting(
        SETTING_KEYS.PAYUNI_TEST_MODE,
        String(validatedData.payuniTestMode ?? true),
      ),
    ]);

    await logAdminAction(user.id as string, {
      action: "update_payment_settings",
      gateway: "payuni",
    });

    revalidatePath("/admin/settings/payment");

    return { success: true };
  } catch (error) {
    console.error("更新金流設定失敗:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "更新金流設定時發生錯誤" };
  }
}

/**
 * 測試金流連線
 */
export async function testPaymentConnection(formValues?: {
  payuniMerchantId?: string;
  payuniHashKey?: string;
  payuniHashIV?: string;
  payuniTestMode?: boolean;
}): Promise<{ success: boolean; message: string }> {
  try {
    await requireOnlyAdminAuth();

    const { getPaymentGatewaySettings, createGatewayFromSettings } =
      await import("@/lib/payment/gateway-factory");

    // 從 DB 讀取現有設定，再用表單值覆蓋（表單空值代表不變更）
    const dbSettings = await getPaymentGatewaySettings();
    const mergedSettings = {
      ...dbSettings,
      gateway: "payuni" as const,
      payuni: {
        merchantId:
          formValues?.payuniMerchantId || dbSettings.payuni.merchantId,
        hashKey: formValues?.payuniHashKey || dbSettings.payuni.hashKey,
        hashIV: formValues?.payuniHashIV || dbSettings.payuni.hashIV,
        testMode: formValues?.payuniTestMode ?? dbSettings.payuni.testMode,
      },
    };

    const gw = createGatewayFromSettings(mergedSettings);
    return await gw.testConnection();
  } catch (error) {
    console.error("測試金流連線失敗:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "測試連線時發生錯誤" };
  }
}

/**
 * 取得 Email 設定
 * 優先從資料庫讀取，資料庫沒有才 fallback 到環境變數
 */
export async function getEmailSettings(): Promise<{
  senderName: string;
  fromEmail: string;
  isConfigured: boolean;
}> {
  await requireOnlyAdminAuth();

  const [senderNameSetting, emailFromSetting] = await Promise.all([
    prisma.siteSetting.findUnique({
      where: { key: SETTING_KEYS.EMAIL_SENDER_NAME },
    }),
    prisma.siteSetting.findUnique({
      where: { key: SETTING_KEYS.EMAIL_FROM },
    }),
  ]);

  const fromEmail =
    emailFromSetting?.value || process.env.EMAIL_FROM || "noreply@example.com";
  const resendApiKey = process.env.RESEND_API_KEY || "";

  return {
    senderName: senderNameSetting?.value || "Course Platform",
    fromEmail,
    isConfigured: !!resendApiKey,
  };
}

export async function getLegalSettings(): Promise<{
  privacyMd: string;
  termsMd: string;
}> {
  await requireOnlyAdminAuth();

  const [privacy, terms] = await Promise.all([
    prisma.siteSetting.findUnique({
      where: { key: SETTING_KEYS.LEGAL_PRIVACY_MD },
    }),
    prisma.siteSetting.findUnique({
      where: { key: SETTING_KEYS.LEGAL_TERMS_MD },
    }),
  ]);

  return {
    privacyMd: privacy?.value || "",
    termsMd: terms?.value || "",
  };
}

export async function updateLegalPrivacy(
  markdown: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireOnlyAdminAuth();
    const parsed = legalMarkdownSchema.safeParse(markdown);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "輸入驗證失敗",
      };
    }
    await upsertSetting(SETTING_KEYS.LEGAL_PRIVACY_MD, parsed.data);

    await logAdminAction(user.id as string, {
      action: "update_legal_privacy",
    });

    revalidatePath("/admin/settings/privacy");
    revalidatePath("/privacy");

    return { success: true };
  } catch (error) {
    console.error("更新隱私權政策失敗:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "更新隱私權政策時發生錯誤" };
  }
}

export async function updateLegalTerms(
  markdown: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireOnlyAdminAuth();
    const parsed = legalMarkdownSchema.safeParse(markdown);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "輸入驗證失敗",
      };
    }
    await upsertSetting(SETTING_KEYS.LEGAL_TERMS_MD, parsed.data);

    await logAdminAction(user.id as string, {
      action: "update_legal_terms",
    });

    revalidatePath("/admin/settings/terms");
    revalidatePath("/terms");

    return { success: true };
  } catch (error) {
    console.error("更新服務條款失敗:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "更新服務條款時發生錯誤" };
  }
}

/**
 * 取得 Header / Footer 版面設定
 */
export async function getLayoutSettings(): Promise<{
  headerLeftLinks: string;
  headerRightLinks: string;
  footerDescription: string;
  footerSections: string;
}> {
  await requireOnlyAdminAuth();

  const keys = [
    SETTING_KEYS.HEADER_LEFT_LINKS,
    SETTING_KEYS.HEADER_RIGHT_LINKS,
    SETTING_KEYS.FOOTER_DESCRIPTION,
    SETTING_KEYS.FOOTER_SECTIONS,
  ];

  const settings = await prisma.siteSetting.findMany({
    where: { key: { in: keys } },
  });

  const map = new Map(settings.map((s) => [s.key, s.value]));

  return {
    headerLeftLinks: map.get(SETTING_KEYS.HEADER_LEFT_LINKS) || "[]",
    headerRightLinks: map.get(SETTING_KEYS.HEADER_RIGHT_LINKS) || "[]",
    footerDescription: map.get(SETTING_KEYS.FOOTER_DESCRIPTION) || "",
    footerSections: map.get(SETTING_KEYS.FOOTER_SECTIONS) || "[]",
  };
}

/**
 * 更新 Header / Footer 版面設定
 */
export async function updateLayoutSettings(
  data: LayoutSettingsFormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireOnlyAdminAuth();

    const validatedData = layoutSettingsSchema.parse(data);

    await Promise.all([
      upsertSetting(
        SETTING_KEYS.HEADER_LEFT_LINKS,
        JSON.stringify(validatedData.headerLeftLinks),
      ),
      upsertSetting(
        SETTING_KEYS.HEADER_RIGHT_LINKS,
        JSON.stringify(validatedData.headerRightLinks),
      ),
      upsertSetting(
        SETTING_KEYS.FOOTER_DESCRIPTION,
        validatedData.footerDescription || "",
      ),
      upsertSetting(
        SETTING_KEYS.FOOTER_SECTIONS,
        JSON.stringify(validatedData.footerSections),
      ),
    ]);

    await logAdminAction(user.id as string, {
      action: "update_layout_settings",
    });

    revalidatePath("/admin/settings/layout");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("更新版面設定失敗:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "更新版面設定時發生錯誤" };
  }
}

export async function getSettingsCompleteness(): Promise<{
  score: number;
  total: number;
  completed: number;
  missing: Array<{ key: string; label: string; suggestion: string }>;
}> {
  await requireOnlyAdminAuth();

  const settings = await prisma.siteSetting.findMany();
  const map = new Map(settings.map((s) => [s.key, s.value]));

  const checks = [
    {
      key: SETTING_KEYS.SITE_NAME,
      label: "站點名稱",
      suggestion: "請在基本設定填寫站點名稱",
    },
    {
      key: SETTING_KEYS.SITE_LOGO,
      label: "站點 Logo（也作為 Icon）",
      suggestion: "請上傳/填入 Logo URL，會同步成 favicon",
    },
    {
      key: SETTING_KEYS.CONTACT_EMAIL,
      label: "聯絡 Email",
      suggestion: "請填入客服聯絡 Email",
    },
    {
      key: SETTING_KEYS.EMAIL_SENDER_NAME,
      label: "Email 發送者名稱",
      suggestion: "請在 Email 設定填入 sender name",
    },
    {
      key: SETTING_KEYS.LEGAL_PRIVACY_MD,
      label: "隱私權政策自訂內容",
      suggestion: "建議填入隱私權政策（可選）",
      optional: true,
    },
    {
      key: SETTING_KEYS.LEGAL_TERMS_MD,
      label: "服務條款自訂內容",
      suggestion: "建議填入服務條款（可選）",
      optional: true,
    },
  ];

  const requiredChecks = checks.filter((c) => !("optional" in c && c.optional));
  const missing = requiredChecks
    .filter((c) => !(map.get(c.key) || "").trim())
    .map((c) => ({ key: c.key, label: c.label, suggestion: c.suggestion }));

  const completed = requiredChecks.length - missing.length;
  const total = requiredChecks.length;
  const score = Math.round((completed / total) * 100);

  return { score, total, completed, missing };
}
