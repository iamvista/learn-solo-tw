// lib/app-url.ts
// 統一取得帶 protocol 的應用程式 URL

export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) {
    console.warn(
      "[app-url] NEXT_PUBLIC_APP_URL 未設定，使用 localhost 作為預設值",
    );
    return "http://localhost:3000";
  }
  return raw.startsWith("http") ? raw : `https://${raw}`;
}
