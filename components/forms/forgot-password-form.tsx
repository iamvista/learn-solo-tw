'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle } from 'lucide-react'
import { requestPasswordReset } from '@/lib/actions/auth'

const initialState: { error?: string; success?: boolean } = {}

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState)

  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8 shadow-none">
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-[#0A0A0A]">忘記密碼</h3>
          <p className="text-sm text-[#525252]">
            輸入您的電子郵件，我們將發送密碼重設連結給您
          </p>
        </div>

        {state?.success ? (
          <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
            <div className="text-sm text-green-700">
              <p className="font-medium">重設信已寄出</p>
              <p className="mt-1">若此信箱已註冊，您將在幾分鐘內收到密碼重設連結。請檢查收件匣（含垃圾郵件資料夾）。</p>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="p-3 text-sm text-red-500 bg-red-50/50 border border-red-200 rounded-lg">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#0A0A0A]">電子郵件</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                required
                disabled={isPending}
                className="rounded-lg border border-[#E5E5E5] bg-white px-4 py-6 text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#F5A524] focus:ring-[#F5A524]/20"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-[#F5A524] py-6 text-base font-semibold text-white transition-colors hover:bg-[#E09000]"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  發送中...
                </>
              ) : (
                '發送重設連結'
              )}
            </Button>
          </form>
        )}

        <div className="text-center text-sm text-[#525252]">
          <Link
            href="/login"
            className="font-semibold text-[#F5A524] hover:text-[#E09000] transition-colors"
          >
            返回登入
          </Link>
        </div>
      </div>
    </div>
  )
}
