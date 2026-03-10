// app/api/auth/[...nextauth]/route.ts
// NextAuth API Route
// 處理所有認證相關的 API 請求

import { handlers } from '@/lib/auth'

// 匯出 GET 和 POST handlers
export const { GET, POST } = handlers
