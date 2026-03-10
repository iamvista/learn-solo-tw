// app/api/payment/return/route.ts
// PAYUNi 付款返回跳轉 API
// PAYUNi 付款完成後將使用者 POST 到此端點，解密後重定向到成功/失敗頁面

import { NextRequest, NextResponse } from 'next/server'
import { getGatewayByType } from '@/lib/payment/gateway-factory'
import { PayUniGateway } from '@/lib/payment/payuni-gateway'
import { getAppUrl } from '@/lib/app-url'

function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return getAppUrl()
  }
  return new URL(request.url).origin
}

export async function POST(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl(request)
    const formData = await request.formData()
    const encryptInfo = formData.get('EncryptInfo')?.toString()
    const hashInfo = formData.get('HashInfo')?.toString()

    if (!encryptInfo || !hashInfo) {
      return NextResponse.redirect(new URL('/checkout/failed', baseUrl), 303)
    }

    // 取得 PAYUNi gateway 實例
    let gateway: PayUniGateway
    try {
      const gw = await getGatewayByType('payuni')
      if (!(gw instanceof PayUniGateway)) {
        throw new Error('Gateway type mismatch')
      }
      gateway = gw
    } catch {
      return NextResponse.redirect(new URL('/checkout/failed', baseUrl), 303)
    }

    const service = gateway.getService()
    const decrypted = service.verifyAndDecrypt(encryptInfo, hashInfo)

    const orderNumber = decrypted.MerTradeNo as string
    const status = decrypted.Status as string

    if (!orderNumber) {
      throw new Error('Missing order number')
    }

    if (status === 'SUCCESS') {
      return NextResponse.redirect(
        new URL(`/checkout/success?orderNo=${orderNumber}`, baseUrl),
        303
      )
    } else {
      return NextResponse.redirect(
        new URL(`/checkout/failed?orderNo=${orderNumber}`, baseUrl),
        303
      )
    }
  } catch (error) {
    console.error('[PAYUNi Return] 處理錯誤:', error)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ? getAppUrl()
      : new URL(request.url).origin
    return NextResponse.redirect(new URL('/checkout/failed', baseUrl), 303)
  }
}
