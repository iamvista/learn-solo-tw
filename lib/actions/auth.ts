// lib/actions/auth.ts
// 認證相關 Server Actions
// 處理登入、註冊等操作

'use server'

import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { headers } from 'next/headers'
import { signIn } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AuthError } from 'next-auth'
import {
  checkLoginSecurity,
  recordFailedLogin,
  recordSuccessfulLogin,
} from '@/lib/auth-security'
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit'
import { getPostHogClient } from '@/lib/posthog-server'
import { redirect } from 'next/navigation'

// ==================== Schema 定義 ====================

/**
 * 登入表單驗證 Schema
 */
const loginSchema = z.object({
  email: z.string().email('請輸入有效的電子郵件'),
  password: z.string().min(1, '請輸入密碼'),
})

/**
 * 註冊表單驗證 Schema
 */
const registerSchema = z.object({
  name: z.string().min(1, '請輸入姓名').max(50, '姓名不能超過 50 個字元'),
  email: z.string().email('請輸入有效的電子郵件'),
  password: z
    .string()
    .min(8, '密碼至少需要 8 個字元'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '兩次輸入的密碼不一致',
  path: ['confirmPassword'],
})

// ==================== Server Actions ====================

/**
 * 電子郵件密碼登入
 */
export async function loginWithCredentials(
  prevState: { error?: string; success?: boolean; redirectTo?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean; redirectTo?: string }> {
  // 驗證表單資料
  const validatedFields = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0]?.message || '請填寫所有欄位',
    }
  }

  const { email, password } = validatedFields.data

  // 讀取 callbackUrl（僅允許站內相對路徑）
  const rawCallbackUrl = formData.get('callbackUrl') as string | null
  const redirectTo = rawCallbackUrl?.startsWith('/') ? rawCallbackUrl : '/'

  // 獲取請求資訊
  const headersList = await headers()
  const ipAddress =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  const userAgent = headersList.get('user-agent') || undefined

  // 檢查登入安全限制
  const securityCheck = await checkLoginSecurity(email, ipAddress)
  if (!securityCheck.allowed) {
    return { error: securityCheck.reason || '登入嘗試過於頻繁，請稍後再試' }
  }

  try {
    // 使用 redirect: false 讓 signIn 不自動重導向，
    // 而是讓 client-side 用 window.location.href 做硬導向，
    // 確保瀏覽器帶著新的 session cookie 發起請求
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    // 登入成功 - 查找用戶並記錄成功登入
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
    if (user) {
      await recordSuccessfulLogin(user.id, ipAddress, userAgent)

      // PostHog: Track successful login on server side
      const posthog = await getPostHogClient()
      if (posthog) {
        posthog.capture({
          distinctId: user.id,
          event: 'user_logged_in',
          properties: {
            login_method: 'credentials',
            email: email,
            source: 'server',
          },
        })
        posthog.identify({
          distinctId: user.id,
          properties: {
            email: email,
          },
        })
        await posthog.flush()
      }
    }

    // 返回成功狀態和重導向目標，由 client-side 處理導航
    return { success: true, redirectTo }
  } catch (error) {
    // 重新拋出 redirect 錯誤，讓 Next.js 正常處理重導向
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }

    // 記錄失敗的登入嘗試
    await recordFailedLogin(email, ipAddress, userAgent)

    // PostHog: Track failed login attempt
    const posthog = await getPostHogClient()
    const failureReason = error instanceof AuthError
      ? (error.type === 'CredentialsSignin' ? 'invalid_credentials' : 'auth_error')
      : 'unknown_error'
    if (posthog) {
      posthog.capture({
        distinctId: email, // Use email as distinct ID for anonymous tracking
        event: 'login_failed',
        properties: {
          login_method: 'credentials',
          failure_reason: failureReason,
          email: email,
        },
      })
      await posthog.flush()
    }

    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: '電子郵件或密碼錯誤' }
        case 'CallbackRouteError': {
          // authorize 拋出的 Error 被 NextAuth 包裝在 cause.err 中
          const originalMessage = (error.cause as { err?: Error })?.err?.message
          if (originalMessage) {
            return { error: originalMessage }
          }
          return { error: '登入時發生錯誤，請稍後再試' }
        }
        default:
          return { error: '登入時發生錯誤，請稍後再試' }
      }
    }

    // 處理其他錯誤
    if (error instanceof Error) {
      return { error: error.message }
    }

    return { error: '登入時發生未知錯誤' }
  }
}

/**
 * 註冊新用戶
 */
export async function registerUser(
  prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  // 驗證表單資料
  const validatedFields = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0]?.message || '請填寫所有欄位',
    }
  }

  const { name, email, password } = validatedFields.data

  try {
    // 檢查電子郵件是否已註冊
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return { error: '此電子郵件已被註冊' }
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 12)

    // 建立新用戶
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })

    // PostHog: Track successful registration
    const posthog = await getPostHogClient()
    if (posthog) {
      posthog.capture({
        distinctId: newUser.id,
        event: 'user_registered',
        properties: {
          registration_method: 'credentials',
          email: email,
          name: name,
        },
      })
      posthog.identify({
        distinctId: newUser.id,
        properties: {
          email: email,
          name: name,
          created_at: new Date().toISOString(),
        },
      })
      await posthog.flush()
    }

    return { success: true }
  } catch (error) {
    console.error('註冊錯誤:', error)
    return { error: '註冊時發生錯誤，請稍後再試' }
  }
}

/**
 * Google OAuth 登入
 */
export async function loginWithGoogle(formData: FormData) {
  const rawCallbackUrl = formData.get('callbackUrl') as string | null
  const redirectTo = rawCallbackUrl?.startsWith('/') ? rawCallbackUrl : '/'
  await signIn('google', { redirectTo })
}

/**
 * Apple OAuth 登入
 */
export async function loginWithApple(formData: FormData) {
  const rawCallbackUrl = formData.get('callbackUrl') as string | null
  const redirectTo = rawCallbackUrl?.startsWith('/') ? rawCallbackUrl : '/'
  await signIn('apple', { redirectTo })
}

/**
 * 請求密碼重設
 * 無論 email 是否存在，統一回傳成功（防止帳號枚舉）
 */
export async function requestPasswordReset(
  prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email || !z.string().email().safeParse(email).success) {
    return { error: '請輸入有效的電子郵件' }
  }

  try {
    const headersList = await headers()
    const ipAddress =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headersList.get('x-real-ip') ||
      headersList.get('cf-connecting-ip') ||
      'unknown'

    const ipRateLimit = checkRateLimit(`password-reset:ip:${ipAddress}`, RATE_LIMIT_CONFIGS.auth)
    const emailRateLimit = checkRateLimit(`password-reset:email:${email}`, RATE_LIMIT_CONFIGS.auth)

    if (!ipRateLimit.success || !emailRateLimit.success) {
      return { error: '操作過於頻繁，請稍後再試' }
    }

    const { sendPasswordResetEmail } = await import('@/lib/password-reset')
    const result = await sendPasswordResetEmail(email)

    if (!result.success) {
      console.error('[Password Reset] 發送失敗:', result.error)
    }

    // 無論是否成功都回傳 success，防止帳號枚舉
    return { success: true }
  } catch (error) {
    console.error('[Password Reset] 錯誤:', error)
    return { success: true }
  }
}
