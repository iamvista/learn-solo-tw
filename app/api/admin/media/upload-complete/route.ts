// app/api/admin/media/upload-complete/route.ts
// 上傳完成回調
// 建立 Media 記錄

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createMedia } from '@/lib/actions/media'
import { getStreamVideoInfo, getStreamThumbnailUrl } from '@/lib/cloudflare'

/**
 * POST /api/admin/media/upload-complete
 * 影片上傳完成後建立 Media 記錄
 */
export async function POST(request: NextRequest) {
  try {
    // 驗證用戶權限
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '未授權存取' },
        { status: 401 }
      )
    }

    const userRole = session.user.role
    if (userRole !== 'ADMIN' && userRole !== 'EDITOR') {
      return NextResponse.json(
        { success: false, error: '權限不足' },
        { status: 403 }
      )
    }

    // 解析請求內容
    const body = await request.json()
    const { uid, originalName, size } = body

    if (!uid) {
      return NextResponse.json(
        { success: false, error: '缺少影片 ID' },
        { status: 400 }
      )
    }

    // 影片大小限制檢查 (5GB = 5 * 1024 * 1024 * 1024 bytes)
    const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024
    if (size && size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { success: false, error: '影片大小超過限制 (最大 5GB)' },
        { status: 400 }
      )
    }

    // 取得影片資訊
    const videoInfo = await getStreamVideoInfo(uid)

    // 建立 Media 記錄
    const result = await createMedia({
      type: 'VIDEO',
      filename: uid,
      originalName: originalName || `video-${uid}`,
      mimeType: 'video/mp4',
      size: size || 0,
      url: `https://watch.cloudflarestream.com/${uid}`,
      cfStreamId: uid,
      cfStatus: videoInfo?.status?.state || 'pending',
      duration: videoInfo?.duration ? Math.round(videoInfo.duration) : undefined,
      thumbnail: getStreamThumbnailUrl(uid),
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      media: result.media,
    })
  } catch (error) {
    console.error('建立媒體記錄失敗:', error)
    return NextResponse.json(
      { success: false, error: '建立媒體記錄時發生錯誤' },
      { status: 500 }
    )
  }
}
