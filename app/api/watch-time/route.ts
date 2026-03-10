// app/api/watch-time/route.ts
// 觀看時間心跳 API
// POST: 記錄用戶每分鐘的觀看心跳

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// 心跳請求驗證
const watchTimeSchema = z.object({
  lessonId: z
    .string()
    .min(1, { message: '單元 ID 為必填' })
    .max(50, { message: '單元 ID 格式錯誤' }),
  duration: z
    .number({ message: '觀看秒數必須為數字' })
    .int({ message: '觀看秒數必須為整數' })
    .min(1, { message: '觀看秒數不能小於 1' })
    .max(120, { message: '觀看秒數不能超過 120' }),
  startedAt: z
    .string()
    .datetime({ message: '開始時間格式錯誤' }),
})

// Rate Limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const windowMs = 60000 // 1 分鐘
  const maxRequests = 5 // 每分鐘最多 5 次心跳（正常應該只有 1 次）

  const limiter = rateLimiter.get(userId)
  if (!limiter || now > limiter.resetTime) {
    rateLimiter.set(userId, { count: 1, resetTime: now + windowMs })
    return true
  }
  if (limiter.count >= maxRequests) return false
  limiter.count++
  return true
}

/**
 * POST /api/watch-time
 * 記錄觀看時間心跳
 */
export async function POST(request: NextRequest) {
  try {
    // 驗證登入狀態
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '請先登入' },
        { status: 401 }
      )
    }

    // Rate Limiting
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { success: false, error: '請求過於頻繁' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const validation = watchTimeSchema.safeParse(body)
    if (!validation.success) {
      const firstError = validation.error.issues[0]
      return NextResponse.json(
        { success: false, error: firstError?.message || '輸入資料格式錯誤' },
        { status: 400 }
      )
    }

    const { lessonId, duration, startedAt } = validation.data

    // 防止未來時間或太久遠的時間
    const startedAtDate = new Date(startedAt)
    const now = new Date()
    const diffMs = now.getTime() - startedAtDate.getTime()
    if (diffMs < -30000 || diffMs > 300000) {
      // 允許 30 秒的時鐘偏差，但不接受超過 5 分鐘前的心跳
      return NextResponse.json(
        { success: false, error: '時間戳不合理' },
        { status: 400 }
      )
    }

    // 寫入心跳記錄
    await prisma.watchTimeLog.create({
      data: {
        userId: session.user.id,
        lessonId,
        startedAt: startedAtDate,
        duration,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('記錄觀看時間失敗:', error)
    return NextResponse.json(
      { success: false, error: '記錄觀看時間失敗' },
      { status: 500 }
    )
  }
}
