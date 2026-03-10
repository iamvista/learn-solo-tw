import { randomBytes, createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendGuestActivation } from '@/lib/email'
import { getAppUrl } from '@/lib/app-url'

const ACTIVATION_TOKEN_HOURS = 24

export function hashGuestActivationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function getActivationBaseUrl(): string {
  return getAppUrl()
}

export function buildGuestActivationUrl(token: string): string {
  return `${getActivationBaseUrl()}/activate-account?token=${encodeURIComponent(token)}`
}

export async function issueGuestActivationToken(userId: string): Promise<{
  token: string
  expiresAt: Date
}> {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashGuestActivationToken(token)
  const expiresAt = new Date(Date.now() + ACTIVATION_TOKEN_HOURS * 60 * 60 * 1000)

  await prisma.guestActivationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  })

  return { token, expiresAt }
}

export async function sendGuestActivationEmail(userId: string): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      isGuest: true,
    },
  })

  if (!user?.isGuest) {
    return { success: false, error: '此帳號不需要啟用流程' }
  }

  const { token } = await issueGuestActivationToken(user.id)
  const activationUrl = buildGuestActivationUrl(token)
  const result = await sendGuestActivation(user.email, activationUrl, user.name || undefined)

  if (!result.success) {
    return { success: false, error: result.error || '寄送啟用信失敗' }
  }

  return { success: true }
}
