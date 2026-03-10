import { prisma } from '@/lib/prisma'
import { SETTING_KEYS } from '@/lib/validations/settings'
import { PUBLIC_SITE_DEFAULTS } from '@/lib/site-settings-public-types'
import type { PublicSiteSettings } from '@/lib/site-settings-public-types'
import { getGoogleCredentials, getAppleCredentials } from '@/lib/auth-credentials'

export { PUBLIC_SITE_DEFAULTS }
export type { PublicSiteSettings }

function safeParseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  const keys = [
    SETTING_KEYS.SITE_NAME,
    SETTING_KEYS.SITE_LOGO,
    SETTING_KEYS.CONTACT_EMAIL,
    SETTING_KEYS.BRAND_DISPLAY_NAME,
    SETTING_KEYS.BRAND_SUBTITLE,
    SETTING_KEYS.HEADER_LEFT_LINKS,
    SETTING_KEYS.HEADER_RIGHT_LINKS,
    SETTING_KEYS.FOOTER_DESCRIPTION,
    SETTING_KEYS.FOOTER_SECTIONS,
  ]

  let settings: { key: string; value: string }[] = []
  try {
    settings = await prisma.siteSetting.findMany({
      where: { key: { in: keys } },
    })
  } catch {
    // DB not available (e.g. during build), return defaults
  }

  const map = new Map(settings.map((s) => [s.key, s.value]))

  // OAuth 啟用與否純粹由環境變數決定
  const googleCreds = getGoogleCredentials()
  const appleCreds = getAppleCredentials()

  return {
    siteName: map.get(SETTING_KEYS.SITE_NAME) || PUBLIC_SITE_DEFAULTS.siteName,
    siteLogo: map.get(SETTING_KEYS.SITE_LOGO) || PUBLIC_SITE_DEFAULTS.siteLogo,
    contactEmail:
      map.get(SETTING_KEYS.CONTACT_EMAIL) || PUBLIC_SITE_DEFAULTS.contactEmail,
    brandDisplayName:
      map.get(SETTING_KEYS.BRAND_DISPLAY_NAME) ||
      PUBLIC_SITE_DEFAULTS.brandDisplayName,
    brandSubtitle:
      map.get(SETTING_KEYS.BRAND_SUBTITLE) || PUBLIC_SITE_DEFAULTS.brandSubtitle,
    googleLoginEnabled: googleCreds.isConfigured,
    appleLoginEnabled: appleCreds.isConfigured,
    headerLeftLinks: safeParseJson(map.get(SETTING_KEYS.HEADER_LEFT_LINKS), []),
    headerRightLinks: safeParseJson(map.get(SETTING_KEYS.HEADER_RIGHT_LINKS), []),
    footerDescription: map.get(SETTING_KEYS.FOOTER_DESCRIPTION) || PUBLIC_SITE_DEFAULTS.footerDescription,
    footerSections: safeParseJson(map.get(SETTING_KEYS.FOOTER_SECTIONS), []),
  }
}
