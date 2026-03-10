// app/api/admin/media/[id]/status/route.ts
// 取得媒體處理狀態
// 用於輪詢影片處理進度和時長

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStreamVideoInfo } from '@/lib/cloudflare'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/admin/media/[id]/status
 * 取得媒體處理狀態（包含最新的 duration）
 */
export async function GET(request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params

    // 取得 Media 記錄
    const media = await prisma.media.findUnique({
      where: { id },
    })

    if (!media) {
      return NextResponse.json(
        { success: false, error: '找不到媒體記錄' },
        { status: 404 }
      )
    }

    // 如果已有 duration，直接返回
    if (media.duration && media.duration > 0) {
      return NextResponse.json({
        success: true,
        media: {
          id: media.id,
          cfStreamId: media.cfStreamId,
          cfStatus: media.cfStatus,
          duration: media.duration,
          ready: true,
        },
      })
    }

    // 如果沒有 cfStreamId，無法查詢
    if (!media.cfStreamId) {
      return NextResponse.json({
        success: true,
        media: {
          id: media.id,
          cfStreamId: null,
          cfStatus: media.cfStatus,
          duration: null,
          ready: false,
        },
      })
    }

    // 從 Cloudflare API 取得最新狀態
    const videoInfo = await getStreamVideoInfo(media.cfStreamId)

    if (!videoInfo) {
      return NextResponse.json({
        success: true,
        media: {
          id: media.id,
          cfStreamId: media.cfStreamId,
          cfStatus: media.cfStatus,
          duration: null,
          ready: false,
        },
      })
    }

    // 如果 Cloudflare 有返回 duration，更新資料庫
    if (videoInfo.duration && videoInfo.duration > 0) {
      const roundedDuration = Math.round(videoInfo.duration)

      await prisma.media.update({
        where: { id: media.id },
        data: {
          duration: roundedDuration,
          cfStatus: videoInfo.status?.state || media.cfStatus,
        },
      })

      return NextResponse.json({
        success: true,
        media: {
          id: media.id,
          cfStreamId: media.cfStreamId,
          cfStatus: videoInfo.status?.state || 'ready',
          duration: roundedDuration,
          ready: true,
        },
      })
    }

    // 影片還在處理中
    return NextResponse.json({
      success: true,
      media: {
        id: media.id,
        cfStreamId: media.cfStreamId,
        cfStatus: videoInfo.status?.state || 'processing',
        duration: null,
        ready: false,
        pctComplete: videoInfo.status?.pctComplete,
      },
    })
  } catch (error) {
    console.error('取得媒體狀態失敗:', error)
    return NextResponse.json(
      { success: false, error: '取得媒體狀態時發生錯誤' },
      { status: 500 }
    )
  }
}
