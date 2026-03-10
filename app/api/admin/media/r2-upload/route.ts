// app/api/admin/media/r2-upload/route.ts
// R2 圖片/檔案上傳
// 支援直接上傳和預簽名 URL

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { uploadToR2, getR2PresignedUploadUrl } from '@/lib/cloudflare'
import { createMedia } from '@/lib/actions/media'
import type { MediaType } from '@prisma/client'

/**
 * POST /api/admin/media/r2-upload
 * 上傳圖片/檔案到 R2
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

    // 解析 FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as MediaType | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: '缺少檔案' },
        { status: 400 }
      )
    }

    // 驗證檔案類型
    const mimeType = file.type
    let mediaType: MediaType = type || 'ATTACHMENT'

    if (!type) {
      if (mimeType.startsWith('image/')) {
        mediaType = 'IMAGE'
      } else {
        mediaType = 'ATTACHMENT'
      }
    }

    // 驗證圖片類型
    if (mediaType === 'IMAGE' && !mimeType.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: '檔案類型不是圖片' },
        { status: 400 }
      )
    }

    // 限制檔案大小（圖片 10MB，附件 50MB）
    const maxSize = mediaType === 'IMAGE' ? 10 * 1024 * 1024 : 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `檔案大小超過限制 (${mediaType === 'IMAGE' ? '10MB' : '50MB'})`,
        },
        { status: 400 }
      )
    }

    // 讀取檔案內容
    const buffer = Buffer.from(await file.arrayBuffer())

    // 上傳到 R2
    const uploadResult = await uploadToR2(buffer, file.name, mimeType)

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error },
        { status: 500 }
      )
    }

    // 建立 Media 記錄
    const mediaResult = await createMedia({
      type: mediaType,
      filename: uploadResult.key!,
      originalName: file.name,
      mimeType: mimeType,
      size: file.size,
      url: uploadResult.url!,
    })

    if (!mediaResult.success) {
      return NextResponse.json(
        { success: false, error: mediaResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      media: mediaResult.media,
      url: uploadResult.url,
    })
  } catch (error) {
    console.error('上傳檔案失敗:', error)
    return NextResponse.json(
      { success: false, error: '上傳檔案時發生錯誤' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/media/r2-upload?filename=xxx&mimeType=xxx
 * 取得預簽名上傳 URL
 */
export async function GET(request: NextRequest) {
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

    // 取得參數
    const searchParams = request.nextUrl.searchParams
    const filename = searchParams.get('filename')
    const mimeType = searchParams.get('mimeType')

    if (!filename || !mimeType) {
      return NextResponse.json(
        { success: false, error: '缺少必要參數' },
        { status: 400 }
      )
    }

    // 取得預簽名 URL
    const result = await getR2PresignedUploadUrl(filename, mimeType)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      uploadUrl: result.url,
      key: result.key,
    })
  } catch (error) {
    console.error('取得預簽名 URL 失敗:', error)
    return NextResponse.json(
      { success: false, error: '取得預簽名 URL 時發生錯誤' },
      { status: 500 }
    )
  }
}
