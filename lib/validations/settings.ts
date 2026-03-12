// lib/validations/settings.ts
// 系統設定驗證規則
// 使用 Zod 進行表單驗證

import { z } from "zod";

/**
 * 設定 Key 常數
 */
export const SETTING_KEYS = {
  // 基本設定
  SITE_NAME: "site_name",
  SITE_LOGO: "site_logo",
  CONTACT_EMAIL: "contact_email",
  // 品牌文案
  BRAND_DISPLAY_NAME: "brand_display_name",
  BRAND_SUBTITLE: "brand_subtitle",
  // 分析追蹤
  GA_ID: "ga_id",
  POSTHOG_KEY: "posthog_key",
  POSTHOG_HOST: "posthog_host",
  POSTHOG_PERSONAL_API_KEY: "posthog_personal_api_key",
  META_PIXEL_ID: "meta_pixel_id",
  META_CAPI_ACCESS_TOKEN: "meta_capi_access_token",
  // Email 設定
  EMAIL_SENDER_NAME: "email_sender_name",
  EMAIL_FROM: "email_from",
  // Legal (Markdown)
  LEGAL_PRIVACY_MD: "legal_privacy_md",
  LEGAL_TERMS_MD: "legal_terms_md",
  // 金流設定
  PAYMENT_GATEWAY: "payment_gateway",
  PAYUNI_MERCHANT_ID: "payuni_merchant_id",
  PAYUNI_HASH_KEY: "payuni_hash_key",
  PAYUNI_HASH_IV: "payuni_hash_iv",
  PAYUNI_TEST_MODE: "payuni_test_mode",
  // Header / Footer 版面設定 (JSON)
  HEADER_LEFT_LINKS: "header_left_links",
  HEADER_RIGHT_LINKS: "header_right_links",
  FOOTER_DESCRIPTION: "footer_description",
  FOOTER_SECTIONS: "footer_sections",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/**
 * 站點設定 Schema
 */
export const siteSettingsSchema = z.object({
  // 站點名稱
  siteName: z
    .string()
    .min(1, { message: "站點名稱不能為空" })
    .max(100, { message: "站點名稱不能超過 100 個字元" }),

  // Logo URL
  siteLogo: z
    .string()
    .url({ message: "請輸入有效的圖片網址" })
    .optional()
    .nullable()
    .or(z.literal("")),

  // 聯絡 Email
  contactEmail: z
    .string()
    .email({ message: "請輸入有效的 Email 地址" })
    .optional()
    .nullable()
    .or(z.literal("")),

  // 品牌文案
  brandDisplayName: z
    .string()
    .max(100, { message: "品牌顯示名稱不能超過 100 個字元" })
    .optional()
    .nullable()
    .or(z.literal("")),

  brandSubtitle: z
    .string()
    .max(100, { message: "品牌副標不能超過 100 個字元" })
    .optional()
    .nullable()
    .or(z.literal("")),

  // Google Analytics ID
  gaId: z
    .string()
    .max(50, { message: "GA ID 不能超過 50 個字元" })
    .optional()
    .nullable()
    .or(z.literal("")),

  // PostHog
  posthogKey: z
    .string()
    .max(200, { message: "PostHog Project API Key 不能超過 200 個字元" })
    .optional()
    .nullable()
    .or(z.literal("")),

  posthogHost: z
    .string()
    .max(200, { message: "PostHog Host 不能超過 200 個字元" })
    .optional()
    .nullable()
    .or(z.literal("")),

  posthogPersonalApiKey: z
    .string()
    .max(200, { message: "PostHog Personal API Key 不能超過 200 個字元" })
    .optional()
    .nullable()
    .or(z.literal("")),

  // Meta Pixel / CAPI
  metaPixelId: z
    .string()
    .max(50, { message: "Meta Pixel ID 不能超過 50 個字元" })
    .optional()
    .nullable()
    .or(z.literal("")),

  metaCapiAccessToken: z
    .string()
    .max(500, { message: "Meta CAPI Access Token 不能超過 500 個字元" })
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type SiteSettingsFormData = z.infer<typeof siteSettingsSchema>;

/**
 * Email 設定 Schema
 */
export const emailSettingsSchema = z.object({
  // Email 發送者名稱
  emailSenderName: z
    .string()
    .min(1, { message: "發送者名稱不能為空" })
    .max(100, { message: "發送者名稱不能超過 100 個字元" }),
  // 發送者 Email
  emailFrom: z
    .string()
    .email({ message: "請輸入有效的 Email 地址" })
    .optional()
    .or(z.literal("")),
});

export type EmailSettingsFormData = z.infer<typeof emailSettingsSchema>;

/**
 * 測試 Email Schema
 */
export const testEmailSchema = z.object({
  email: z.string().email({ message: "請輸入有效的 Email 地址" }),
});

export type TestEmailFormData = z.infer<typeof testEmailSchema>;

/**
 * 金流設定 Schema（PAYUNi）
 */
export const paymentSettingsSchema = z
  .object({
    gateway: z.literal("payuni"),
    payuniMerchantId: z.string().optional().or(z.literal("")),
    payuniHashKey: z.string().optional().or(z.literal("")),
    payuniHashIV: z.string().optional().or(z.literal("")),
    payuniTestMode: z.boolean().default(true),
  })
  .refine(
    (data) => {
      return (
        !!data.payuniMerchantId && !!data.payuniHashKey && !!data.payuniHashIV
      );
    },
    {
      message: "請填寫 PAYUNi 的必要設定",
    },
  )
  .refine(
    (data) => {
      if (data.payuniHashKey) {
        return data.payuniHashKey.length === 32;
      }
      return true;
    },
    {
      message: "PAYUNi Hash Key 必須剛好 32 字元",
      path: ["payuniHashKey"],
    },
  )
  .refine(
    (data) => {
      if (data.payuniHashIV) {
        return data.payuniHashIV.length === 16;
      }
      return true;
    },
    {
      message: "PAYUNi Hash IV 必須剛好 16 字元",
      path: ["payuniHashIV"],
    },
  );

export type PaymentSettingsFormData = z.infer<typeof paymentSettingsSchema>;

export const legalMarkdownSchema = z
  .string()
  .max(200000, { message: "內容不能超過 200,000 個字元" });

export type LegalMarkdownInput = z.infer<typeof legalMarkdownSchema>;

/**
 * Header / Footer 版面設定
 */
export const navLinkSchema = z.object({
  label: z.string().min(1, "連結名稱不能為空").max(50),
  url: z.string().min(1, "連結網址不能為空").max(500),
  openInNewTab: z.boolean().default(false),
});

export type NavLink = z.infer<typeof navLinkSchema>;

export const footerLinkSchema = z.object({
  label: z.string().min(1, "連結名稱不能為空").max(50),
  url: z.string().min(1, "連結網址不能為空").max(500),
  icon: z.string().max(50).optional().or(z.literal("")),
});

export type FooterLink = z.infer<typeof footerLinkSchema>;

export const footerSectionSchema = z.object({
  title: z.string().min(1, "列表標題不能為空").max(50),
  links: z.array(footerLinkSchema).max(10),
});

export type FooterSection = z.infer<typeof footerSectionSchema>;

export const layoutSettingsSchema = z.object({
  headerLeftLinks: z.array(navLinkSchema).max(10).default([]),
  headerRightLinks: z.array(navLinkSchema).max(10).default([]),
  footerDescription: z.string().max(500).optional().or(z.literal("")),
  footerSections: z.array(footerSectionSchema).max(5).default([]),
});

export type LayoutSettingsFormData = z.infer<typeof layoutSettingsSchema>;
