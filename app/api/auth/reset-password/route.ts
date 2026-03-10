import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPasswordResetToken } from '@/lib/password-reset'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit'

const resetPasswordSchema = z.object({
  token: z.string().min(1, '重設 token 為必填'),
  password: z.string().min(8, '密碼至少需要 8 個字元'),
})

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting：防止暴力破解 token
    const identifier = getIdentifier(request)
    const rateLimitResult = checkRateLimit(`reset-password:${identifier}`, RATE_LIMIT_CONFIGS.auth)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: '請求過於頻繁，請稍後再試' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }
    const body = await request.json()
    const parsed = resetPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || '請求資料格式錯誤' },
        { status: 400 }
      )
    }

    const { token, password } = parsed.data
    const tokenHash = hashPasswordResetToken(token)

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        usedAt: true,
        expiresAt: true,
      },
    })

    if (!resetToken) {
      return NextResponse.json({ error: '重設連結無效' }, { status: 400 })
    }

    if (resetToken.usedAt) {
      return NextResponse.json({ error: '此重設連結已使用' }, { status: 400 })
    }

    if (resetToken.expiresAt <= new Date()) {
      return NextResponse.json({ error: '重設連結已過期，請重新申請' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.$transaction(async (tx) => {
      const now = new Date()

      // 先以條件更新消耗 token，避免併發請求重複使用同一 token
      const consumeResult = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      })

      if (consumeResult.count === 0) {
        throw new Error('RESET_TOKEN_ALREADY_USED_OR_EXPIRED')
      }

      // 更新密碼，若為 guest 帳號同時升級
      const user = await tx.user.findUnique({
        where: { id: resetToken.userId },
        select: { isGuest: true },
      })

      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          password: hashedPassword,
          ...(user?.isGuest
            ? { isGuest: false, guestActivatedAt: now }
            : {}),
        },
      })

      // 同步失效同使用者其他尚未使用 token，避免舊信連結再次重設
      await tx.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          usedAt: null,
        },
        data: { usedAt: now },
      })
    })

    return NextResponse.json({
      success: true,
      message: '密碼已重設，請使用新密碼登入',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'RESET_TOKEN_ALREADY_USED_OR_EXPIRED') {
      return NextResponse.json({ error: '此重設連結已失效，請重新申請' }, { status: 400 })
    }
    console.error('[Reset Password] 錯誤:', error)
    return NextResponse.json({ error: '重設失敗，請稍後再試' }, { status: 500 })
  }
}
