// lib/actions/media.ts
// 媒體管理 Server Actions
// 提供媒體 CRUD 操作

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/require-admin";
import {
  deleteStreamVideo,
  deleteFromR2,
  getR2KeyFromUrl,
  getStreamVideoInfo,
} from "@/lib/cloudflare";
import type { MediaType, Media } from "@prisma/client";

/**
 * 媒體列表查詢參數
 */
export interface GetMediaParams {
  type?: MediaType | "ALL";
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 媒體列表回傳結果
 */
export interface GetMediaResult {
  media: Media[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 建立媒體記錄參數
 */
export interface CreateMediaData {
  type: MediaType;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  cfStreamId?: string;
  cfStatus?: string;
  duration?: number;
  thumbnail?: string;
}

// requireAdminAuth 從 @/lib/require-admin 引入（直接查 DB 確保角色即時生效）

/**
 * 取得媒體列表（含搜尋、篩選、分頁）
 */
export async function getMediaList(
  params: GetMediaParams = {},
): Promise<GetMediaResult> {
  await requireAdminAuth();

  const { type, search, page = 1, pageSize = 20 } = params;

  // 建立查詢條件
  const where: {
    type?: MediaType;
    OR?: Array<{
      filename?: { contains: string; mode: "insensitive" };
      originalName?: { contains: string; mode: "insensitive" };
    }>;
  } = {};

  if (type && type !== "ALL") {
    where.type = type;
  }

  if (search) {
    where.OR = [
      { filename: { contains: search, mode: "insensitive" } },
      { originalName: { contains: search, mode: "insensitive" } },
    ];
  }

  // 查詢總數
  const total = await prisma.media.count({ where });

  // 查詢媒體列表
  const media = await prisma.media.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    media,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 取得單一媒體
 */
export async function getMediaById(id: string): Promise<Media | null> {
  await requireAdminAuth();

  const media = await prisma.media.findUnique({
    where: { id },
  });

  return media;
}

/**
 * 根據 Cloudflare Stream ID 取得媒體
 */
export async function getMediaByCfStreamId(
  cfStreamId: string,
): Promise<Media | null> {
  await requireAdminAuth();

  const media = await prisma.media.findFirst({
    where: { cfStreamId },
  });

  return media;
}

/**
 * 建立媒體記錄
 */
export async function createMedia(
  data: CreateMediaData,
): Promise<{ success: boolean; media?: Media; error?: string }> {
  try {
    const user = await requireAdminAuth();

    const media = await prisma.media.create({
      data: {
        type: data.type,
        filename: data.filename,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
        url: data.url,
        cfStreamId: data.cfStreamId ?? null,
        cfStatus: data.cfStatus ?? null,
        duration: data.duration ?? null,
        thumbnail: data.thumbnail ?? null,
        uploadedBy: user.id as string,
      },
    });

    // 重新驗證頁面快取
    revalidatePath("/admin/media");
    revalidatePath("/admin/media/videos");
    revalidatePath("/admin/media/images");

    return { success: true, media };
  } catch (error) {
    console.error("建立媒體記錄失敗:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "建立媒體記錄時發生錯誤" };
  }
}

/**
 * 更新媒體記錄
 */
export async function updateMedia(
  id: string,
  data: Partial<CreateMediaData>,
): Promise<{ success: boolean; media?: Media; error?: string }> {
  try {
    await requireAdminAuth();

    const existingMedia = await prisma.media.findUnique({
      where: { id },
    });

    if (!existingMedia) {
      return { success: false, error: "媒體不存在" };
    }

    const media = await prisma.media.update({
      where: { id },
      data: {
        ...(data.filename && { filename: data.filename }),
        ...(data.originalName && { originalName: data.originalName }),
        ...(data.mimeType && { mimeType: data.mimeType }),
        ...(data.size && { size: data.size }),
        ...(data.url && { url: data.url }),
        ...(data.cfStreamId !== undefined && { cfStreamId: data.cfStreamId }),
        ...(data.cfStatus !== undefined && { cfStatus: data.cfStatus }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.thumbnail !== undefined && { thumbnail: data.thumbnail }),
      },
    });

    // 重新驗證頁面快取
    revalidatePath("/admin/media");
    revalidatePath("/admin/media/videos");
    revalidatePath("/admin/media/images");

    return { success: true, media };
  } catch (error) {
    console.error("更新媒體記錄失敗:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "更新媒體記錄時發生錯誤" };
  }
}

/**
 * 重新命名媒體
 */
export async function renameMedia(
  id: string,
  newName: string,
): Promise<{ success: boolean; media?: Media; error?: string }> {
  try {
    await requireAdminAuth();

    if (!newName.trim()) {
      return { success: false, error: "名稱不能為空" };
    }

    const media = await prisma.media.update({
      where: { id },
      data: { originalName: newName.trim() },
    });

    revalidatePath("/admin/media");
    revalidatePath("/admin/media/videos");
    revalidatePath("/admin/media/images");

    return { success: true, media };
  } catch (error) {
    console.error("重新命名媒體失敗:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "重新命名媒體時發生錯誤" };
  }
}

/**
 * 檢查影片是否被課程單元使用中
 * 根據 cfStreamId 查找所有引用該影片的 Lesson
 */
export async function checkMediaUsage(id: string): Promise<{
  success: boolean;
  usages?: {
    lessonId: string;
    lessonTitle: string;
    chapterTitle: string;
    courseTitle: string;
  }[];
  error?: string;
}> {
  try {
    await requireAdminAuth();

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) return { success: false, error: "媒體不存在" };

    // 影片才需要檢查（圖片不追蹤使用情況）
    if (media.type !== "VIDEO" || !media.cfStreamId) {
      return { success: true, usages: [] };
    }

    const lessons = await prisma.lesson.findMany({
      where: { videoId: media.cfStreamId },
      select: {
        id: true,
        title: true,
        chapter: {
          select: {
            title: true,
            course: {
              select: { title: true },
            },
          },
        },
      },
    });

    return {
      success: true,
      usages: lessons.map((l) => ({
        lessonId: l.id,
        lessonTitle: l.title,
        chapterTitle: l.chapter.title,
        courseTitle: l.chapter.course.title,
      })),
    };
  } catch (error) {
    console.error("檢查媒體使用情況失敗:", error);
    return { success: false, error: "檢查使用情況時發生錯誤" };
  }
}

/**
 * 刪除媒體
 * 注意：此操作會先刪除外部儲存，成功後再刪除資料庫記錄
 * 若外部儲存刪除失敗，整個操作將中止以避免產生孤兒資源
 */
export async function deleteMedia(
  id: string,
  options?: { forceDeleteDb?: boolean },
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminAuth();

    // 取得媒體資訊
    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      return { success: false, error: "媒體不存在" };
    }

    // 根據類型刪除實際檔案（必須先成功才能刪除資料庫記錄）
    if (media.type === "VIDEO" && media.cfStreamId) {
      // 刪除 Cloudflare Stream 影片
      const deleteResult = await deleteStreamVideo(media.cfStreamId);
      if (!deleteResult.success) {
        console.error("刪除 Stream 影片失敗:", deleteResult.error);
        // 如果不是強制刪除，中止操作
        if (!options?.forceDeleteDb) {
          return {
            success: false,
            error: `刪除外部儲存失敗: ${deleteResult.error}。如需強制刪除資料庫記錄，請聯繫管理員。`,
          };
        }
      }
    } else if (media.type === "IMAGE" || media.type === "ATTACHMENT") {
      // 刪除 R2 檔案
      const key = getR2KeyFromUrl(media.url);
      if (key) {
        const deleteResult = await deleteFromR2(key);
        if (!deleteResult.success) {
          console.error("刪除 R2 檔案失敗:", deleteResult.error);
          // 如果不是強制刪除，中止操作
          if (!options?.forceDeleteDb) {
            return {
              success: false,
              error: `刪除外部儲存失敗: ${deleteResult.error}。如需強制刪除資料庫記錄，請聯繫管理員。`,
            };
          }
        }
      }
    }

    // 外部儲存刪除成功後，刪除資料庫記錄
    await prisma.media.delete({
      where: { id },
    });

    // 重新驗證頁面快取
    revalidatePath("/admin/media");
    revalidatePath("/admin/media/videos");
    revalidatePath("/admin/media/images");

    return { success: true };
  } catch (error) {
    console.error("刪除媒體失敗:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "刪除媒體時發生錯誤" };
  }
}

/**
 * 批次刪除媒體
 */
export async function deleteMediaBatch(
  ids: string[],
): Promise<{ success: boolean; error?: string; failedIds?: string[] }> {
  try {
    await requireAdminAuth();

    const failedIds: string[] = [];

    for (const id of ids) {
      const result = await deleteMedia(id);
      if (!result.success) {
        failedIds.push(id);
      }
    }

    if (failedIds.length > 0) {
      return {
        success: false,
        error: `部分媒體刪除失敗`,
        failedIds,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("批次刪除媒體失敗:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "批次刪除媒體時發生錯誤" };
  }
}

/**
 * 同步影片資訊（從 Cloudflare Stream 取得最新的 duration 和 status）
 */
export async function syncMediaInfo(
  id: string,
): Promise<{ success: boolean; media?: Media; error?: string }> {
  try {
    await requireAdminAuth();

    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      return { success: false, error: "媒體不存在" };
    }

    if (media.type !== "VIDEO" || !media.cfStreamId) {
      return { success: false, error: "只有 Cloudflare Stream 影片可以同步" };
    }

    // 從 Cloudflare 取得影片資訊
    const videoInfo = await getStreamVideoInfo(media.cfStreamId);

    if (!videoInfo) {
      return { success: false, error: "無法從 Cloudflare 取得影片資訊" };
    }

    // 更新媒體記錄
    const updatedMedia = await prisma.media.update({
      where: { id },
      data: {
        cfStatus: videoInfo.status?.state || media.cfStatus,
        duration: videoInfo.duration
          ? Math.round(videoInfo.duration)
          : media.duration,
      },
    });

    // 重新驗證頁面快取
    revalidatePath("/admin/media");
    revalidatePath("/admin/media/videos");

    return { success: true, media: updatedMedia };
  } catch (error) {
    console.error("同步媒體資訊失敗:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "同步媒體資訊時發生錯誤" };
  }
}

/**
 * 批次同步所有缺少 duration 的影片
 */
export async function syncAllPendingMedia(): Promise<{
  success: boolean;
  syncedCount: number;
  failedCount: number;
  error?: string;
}> {
  try {
    await requireAdminAuth();

    // 找出所有缺少 duration 的影片
    const pendingMedia = await prisma.media.findMany({
      where: {
        type: "VIDEO",
        cfStreamId: { not: null },
        OR: [{ duration: null }, { cfStatus: { not: "ready" } }],
      },
    });

    let syncedCount = 0;
    let failedCount = 0;

    for (const media of pendingMedia) {
      if (!media.cfStreamId) continue;

      const videoInfo = await getStreamVideoInfo(media.cfStreamId);

      if (videoInfo) {
        await prisma.media.update({
          where: { id: media.id },
          data: {
            cfStatus: videoInfo.status?.state || media.cfStatus,
            duration: videoInfo.duration
              ? Math.round(videoInfo.duration)
              : media.duration,
          },
        });
        syncedCount++;
      } else {
        failedCount++;
      }
    }

    // 重新驗證頁面快取
    revalidatePath("/admin/media");
    revalidatePath("/admin/media/videos");

    return { success: true, syncedCount, failedCount };
  } catch (error) {
    console.error("批次同步媒體資訊失敗:", error);

    if (error instanceof Error) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        error: error.message,
      };
    }

    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      error: "批次同步媒體資訊時發生錯誤",
    };
  }
}

/**
 * 取得媒體統計
 */
export async function getMediaStats(): Promise<{
  totalVideos: number;
  totalImages: number;
  totalAttachments: number;
  totalSize: number;
}> {
  await requireAdminAuth();

  const [videoStats, imageStats, attachmentStats] = await Promise.all([
    prisma.media.aggregate({
      where: { type: "VIDEO" },
      _count: true,
      _sum: { size: true },
    }),
    prisma.media.aggregate({
      where: { type: "IMAGE" },
      _count: true,
      _sum: { size: true },
    }),
    prisma.media.aggregate({
      where: { type: "ATTACHMENT" },
      _count: true,
      _sum: { size: true },
    }),
  ]);

  return {
    totalVideos: videoStats._count,
    totalImages: imageStats._count,
    totalAttachments: attachmentStats._count,
    totalSize:
      (videoStats._sum.size || 0) +
      (imageStats._sum.size || 0) +
      (attachmentStats._sum.size || 0),
  };
}
