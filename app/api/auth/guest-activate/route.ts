import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashGuestActivationToken } from '@/lib/guest-activation'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit'

const activateGuestSchema = z.object({
  token: z.string().min(1, '啟用 token 為必填'),
  password: z
    .string()
    .min(8, '密碼至少需要 8 個字元'),
})

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting：防止暴力破解 token
    const identifier = getIdentifier(request)
    const rateLimitResult = checkRateLimit(`guest-activate:${identifier}`, RATE_LIMIT_CONFIGS.auth)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: '請求過於頻繁，請稍後再試' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }
    const body = await request.json()
    const parsed = activateGuestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || '請求資料格式錯誤',
        },
        { status: 400 }
      )
    }

    const { token, password } = parsed.data
    const tokenHash = hashGuestActivationToken(token)

    const activationToken = await prisma.guestActivationToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        usedAt: true,
        expiresAt: true,
      },
    })

    if (!activationToken) {
      return NextResponse.json({ error: '啟用連結無效' }, { status: 400 })
    }

    if (activationToken.usedAt) {
      return NextResponse.json({ error: '此啟用連結已使用' }, { status: 400 })
    }

    if (activationToken.expiresAt < new Date()) {
      return NextResponse.json({ error: '啟用連結已過期，請重新取得' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: activationToken.userId },
      select: {
        id: true,
        isGuest: true,
      },
    })

    if (!user || !user.isGuest) {
      return NextResponse.json({ error: '此帳號不需要啟用' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          isGuest: false,
          guestActivatedAt: new Date(),
        },
      })

      await tx.guestActivationToken.update({
        where: { id: activationToken.id },
        data: { usedAt: new Date() },
      })
    })

    return NextResponse.json({
      success: true,
      message: '帳號已啟用，請使用 Email 與新密碼登入',
    })
  } catch (error) {
    console.error('[Guest Activate] 錯誤:', error)
    return NextResponse.json({ error: '啟用失敗，請稍後再試' }, { status: 500 })
  }
}
