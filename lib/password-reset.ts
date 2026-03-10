import { randomBytes, createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendPasswordReset } from '@/lib/email'
import { getAppUrl } from '@/lib/app-url'

const RESET_TOKEN_HOURS = 1

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function getBaseUrl(): string {
  return getAppUrl()
}

export function buildPasswordResetUrl(token: string): string {
  return `${getBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`
}

export async function issuePasswordResetToken(userId: string): Promise<{
  token: string
  expiresAt: Date
}> {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashPasswordResetToken(token)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + RESET_TOKEN_HOURS * 60 * 60 * 1000)

  await prisma.$transaction(async (tx) => {
    // 發送新重設信前，先讓同使用者既有未使用 token 失效
    await tx.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    })

    await tx.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    })
  })

  return { token, expiresAt }
}

export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      isGuest: true,
      accounts: { select: { provider: true } },
    },
  })

  // 純 OAuth 帳號（無密碼、非 guest）不需要重設密碼
  if (!user || (!user.password && !user.isGuest && user.accounts.length > 0)) {
    // 靜默成功，防止帳號枚舉
    return { success: true }
  }

  const { token } = await issuePasswordResetToken(user.id)
  const resetUrl = buildPasswordResetUrl(token)
  const result = await sendPasswordReset(user.email, resetUrl, user.name || undefined)

  if (!result.success) {
    return { success: false, error: result.error || '寄送重設信失敗' }
  }

  return { success: true }
}
