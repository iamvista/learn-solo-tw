// lib/app-url.ts
// 統一取得帶 protocol 的應用程式 URL

export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'
  return raw.startsWith('http') ? raw : `https://${raw}`
}
