import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  purchaseConfirmationTemplate,
  passwordResetTemplate,
  guestActivationTemplate,
  testEmailTemplate,
} from '@/lib/email-templates'
import { prisma } from '@/lib/prisma'
import { SETTING_KEYS } from '@/lib/validations/settings'
import { getAppUrl } from '@/lib/app-url'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: '未授權存取' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'purchase'

  const [siteName, siteLogo] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: SETTING_KEYS.SITE_NAME } }),
    prisma.siteSetting.findUnique({ where: { key: SETTING_KEYS.SITE_LOGO } }),
  ])

  const appUrl = getAppUrl()
  const branding = {
    siteName: siteName?.value || '自由人學院',
    siteLogo: siteLogo?.value || `${appUrl}/icon.png`,
  }

  let html = ''

  if (type === 'purchase') {
    html = purchaseConfirmationTemplate(
      {
        userName: '測試學員',
        courseName: '示範課程',
        orderNo: 'TEST-ORDER-001',
        amount: 1990,
      },
      branding
    )
  } else if (type === 'passwordReset') {
    html = passwordResetTemplate(
      {
        userName: '測試學員',
        resetUrl: `${appUrl}/reset-password?token=preview-token`,
      },
      branding
    )
  } else if (type === 'guestActivation') {
    html = guestActivationTemplate(
      {
        userName: '測試學員',
        activationUrl: `${appUrl}/activate-account?token=preview-token`,
      },
      branding
    )
  } else {
    html = testEmailTemplate(branding)
  }

  return NextResponse.json({ success: true, html })
}
