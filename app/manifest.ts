// app/manifest.ts
// PWA Web App Manifest
// 動態產生 manifest.json，從資料庫讀取品牌設定

import type { MetadataRoute } from 'next'
import { getPublicSiteSettings } from '@/lib/site-settings-public'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { siteName, siteLogo } = await getPublicSiteSettings()

  return {
    name: siteName,
    short_name: siteName,
    description: `${siteName} — 線上課程平臺`,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#C41E3A',
    icons: [
      {
        src: siteLogo || '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: siteLogo || '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
