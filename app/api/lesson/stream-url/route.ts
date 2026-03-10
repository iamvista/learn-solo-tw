// app/api/lesson/stream-url/route.ts
// 影片串流簽名 URL API
// POST: 取得帶簽名的 Cloudflare Stream URL

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSignedStreamToken } from '@/lib/cloudflare'
import { checkLessonAccess } from '@/lib/actions/lesson'

/**
 * 請求格式
 */
interface StreamUrlRequest {
  lessonId: string
  videoId: string
}

/**
 * POST /api/lesson/stream-url
 * 取得帶簽名的影片串流 URL
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

    // 解析請求內容
    const body: StreamUrlRequest = await request.json()
    const { lessonId, videoId } = body

    // 驗證必要參數
    if (!lessonId || !videoId) {
      return NextResponse.json(
        { success: false, error: '缺少必要參數' },
        { status: 400 }
      )
    }

    // 檢查用戶是否有權限存取此單元
    const accessStatus = await checkLessonAccess(lessonId)

    // 處理不同的存取狀態
    if (accessStatus === 'not_found') {
      return NextResponse.json(
        { success: false, error: '單元不存在' },
        { status: 404 }
      )
    }

    if (accessStatus === 'not_logged_in') {
      return NextResponse.json(
        { success: false, error: '請先登入' },
        { status: 401 }
      )
    }

    if (accessStatus === 'not_purchased') {
      return NextResponse.json(
        { success: false, error: '您尚未購買此課程' },
        { status: 403 }
      )
    }

    // 取得單元資訊，驗證 videoId 是否匹配
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { videoId: true },
    })

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: '單元不存在' },
        { status: 404 }
      )
    }

    // 驗證請求的 videoId 與單元的 videoId 是否匹配
    if (lesson.videoId !== videoId) {
      return NextResponse.json(
        { success: false, error: '影片 ID 不匹配' },
        { status: 400 }
      )
    }

    // 產生簽名資訊（2 小時有效）
    const expiresIn = 7200
    const signedToken = await generateSignedStreamToken(videoId, expiresIn)

    if (!signedToken) {
      return NextResponse.json(
        { success: false, error: '無法產生影片串流 Token' },
        { status: 500 }
      )
    }

    // 構建 signed URL 格式：signedToken
    // @cloudflare/stream-react 的 src 接受這種格式
    const signedUrl = signedToken.token

    return NextResponse.json({
      success: true,
      signedUrl,
      customerCode: signedToken.customerCode,
      expiresIn,
    })
  } catch (error) {
    console.error('取得影片串流 URL 失敗:', error)
    return NextResponse.json(
      { success: false, error: '取得影片串流 URL 失敗' },
      { status: 500 }
    )
  }
}
