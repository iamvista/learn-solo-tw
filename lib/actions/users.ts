// lib/actions/users.ts
// 用戶管理 Server Actions
// 提供用戶查詢、角色管理、課程授權操作

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth, requireOnlyAdminAuth } from "@/lib/require-admin";
import {
  grantAccessSchema,
  revokeAccessSchema,
  updateRoleSchema,
  updateUserSchema,
  deleteUserSchema,
  updateAdminNotesSchema,
  type GrantAccessData,
  type RevokeAccessData,
  type UpdateRoleData,
  type UpdateUserData,
  type DeleteUserData,
  type UpdateAdminNotesData,
} from "@/lib/validations/user";
import type { UserRole, User, Purchase, Course } from "@prisma/client";

/**
 * 用戶列表查詢參數
 */
export interface GetUsersParams {
  search?: string;
  hasPurchase?: "all" | "yes" | "no";
  page?: number;
  pageSize?: number;
}

/**
 * 用戶資訊（含購買數量）
 */
export interface UserWithPurchaseCount extends User {
  _count: {
    purchases: number;
  };
}

/**
 * 用戶列表回傳結果
 */
export interface GetUsersResult {
  users: UserWithPurchaseCount[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 用戶詳情（含購買記錄和學習進度）
 */
export interface UserDetail extends User {
  purchases: (Purchase & {
    course: Course;
  })[];
  progress: {
    lessonId: string;
    completed: boolean;
    watchedSec: number;
    lastWatchAt: Date;
    lesson: {
      id: string;
      title: string;
      videoDuration: number | null;
      chapter: {
        id: string;
        title: string;
        courseId: string;
        course: {
          id: string;
          title: string;
        };
      };
    };
  }[];
}

/**
 * 管理員用戶資訊
 */
export interface AdminUser extends User {
  _count: {
    adminLogs: number;
  };
}

/**
 * 課程進度統計
 */
export interface CourseProgress {
  courseId: string;
  courseTitle: string;
  totalLessons: number;
  completedLessons: number;
  totalDuration: number;
  watchedDuration: number;
  progressPercent: number;
  lastWatchAt: Date | null;
}

// requireAdminAuth, requireOnlyAdminAuth 從 @/lib/require-admin 引入（直接查 DB 確保角色即時生效）

/**
 * 記錄管理員操作日誌
 */
async function logAdminAction(
  adminId: string,
  action:
    | "GRANT_ACCESS"
    | "REVOKE_ACCESS"
    | "UPDATE_USER_ROLE"
    | "UPDATE_USER"
    | "DELETE_USER"
    | "UPDATE_ADMIN_NOTES",
  targetId: string,
  details?: Record<string, unknown>,
) {
  try {
    await prisma.adminLog.create({
      data: {
        adminId,
        action,
        targetType: "User",
        targetId,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      },
    });
  } catch (error) {
    console.error("記錄操作日誌失敗:", error);
  }
}

/**
 * 取得學員列表（排除 ADMIN 和 EDITOR）
 */
export async function getUsers(
  params: GetUsersParams = {},
): Promise<GetUsersResult> {
  await requireAdminAuth();

  const { search, hasPurchase = "all", page = 1, pageSize = 20 } = params;

  // 建立查詢條件
  const where: {
    role: UserRole;
    OR?: {
      name?: { contains: string; mode: "insensitive" };
      email?: { contains: string; mode: "insensitive" };
    }[];
    purchases?: { some?: object; none?: object };
  } = {
    role: "USER",
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (hasPurchase === "yes") {
    where.purchases = { some: {} };
  } else if (hasPurchase === "no") {
    where.purchases = { none: {} };
  }

  // 查詢總數
  const total = await prisma.user.count({ where });

  // 查詢用戶列表
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      _count: {
        select: { purchases: true },
      },
    },
  });

  return {
    users,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 取得單一用戶詳情
 */
export async function getUserById(id: string): Promise<UserDetail | null> {
  await requireAdminAuth();

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      purchases: {
        where: { revokedAt: null },
        include: {
          course: true,
        },
        orderBy: { createdAt: "desc" },
      },
      progress: {
        include: {
          lesson: {
            include: {
              chapter: {
                include: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { lastWatchAt: "desc" },
      },
    },
  });

  return user as UserDetail | null;
}

/**
 * 取得用戶學習進度（按課程統計）
 */
export async function getUserProgress(
  userId: string,
): Promise<CourseProgress[]> {
  await requireAdminAuth();

  // 取得用戶已購買的課程
  const purchases = await prisma.purchase.findMany({
    where: {
      userId,
      revokedAt: null,
    },
    include: {
      course: {
        include: {
          chapters: {
            include: {
              lessons: {
                select: {
                  id: true,
                  videoDuration: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // 取得用戶的學習進度
  const progress = await prisma.lessonProgress.findMany({
    where: { userId },
  });

  // 建立進度查詢 Map
  const progressMap = new Map(progress.map((p) => [p.lessonId, p]));

  // 計算每個課程的進度
  const courseProgressList: CourseProgress[] = purchases.map((purchase) => {
    const course = purchase.course;
    let totalLessons = 0;
    let completedLessons = 0;
    let totalDuration = 0;
    let watchedDuration = 0;
    let lastWatchAt: Date | null = null;

    course.chapters.forEach((chapter) => {
      chapter.lessons.forEach((lesson) => {
        totalLessons++;
        totalDuration += lesson.videoDuration ?? 0;

        const lessonProgress = progressMap.get(lesson.id);
        if (lessonProgress) {
          if (lessonProgress.completed) {
            completedLessons++;
          }
          watchedDuration += lessonProgress.watchedSec;
          if (!lastWatchAt || lessonProgress.lastWatchAt > lastWatchAt) {
            lastWatchAt = lessonProgress.lastWatchAt;
          }
        }
      });
    });

    const progressPercent =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

    return {
      courseId: course.id,
      courseTitle: course.title,
      totalLessons,
      completedLessons,
      totalDuration,
      watchedDuration,
      progressPercent,
      lastWatchAt,
    };
  });

  return courseProgressList;
}

/**
 * 取得管理員列表（ADMIN 和 EDITOR）
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  await requireOnlyAdminAuth();

  const admins = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "EDITOR"] },
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    include: {
      _count: {
        select: { adminLogs: true },
      },
    },
  });

  return admins;
}

/**
 * 更新用戶角色
 */
export async function updateUserRole(
  data: UpdateRoleData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireOnlyAdminAuth();

    // 驗證資料
    const validatedData = updateRoleSchema.parse(data);

    // 檢查是否修改自己的角色
    if (validatedData.userId === currentUser.id) {
      return { success: false, error: "無法修改自己的角色" };
    }

    // 查詢目標用戶
    const targetUser = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    });

    if (!targetUser) {
      return { success: false, error: "用戶不存在" };
    }

    // 如果目標用戶是 ADMIN，檢查是否為最後一位管理員
    if (targetUser.role === "ADMIN" && validatedData.role !== "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      });

      if (adminCount <= 1) {
        return { success: false, error: "必須保留至少一位管理員" };
      }
    }

    // 更新角色
    await prisma.user.update({
      where: { id: validatedData.userId },
      data: { role: validatedData.role },
    });

    // 記錄操作日誌
    await logAdminAction(
      currentUser.id as string,
      "UPDATE_USER_ROLE",
      validatedData.userId,
      {
        from: targetUser.role,
        to: validatedData.role,
      },
    );

    // 重新驗證頁面快取
    revalidatePath("/admin/users");
    revalidatePath("/admin/users/admins");
    revalidatePath(`/admin/users/${validatedData.userId}`);

    return { success: true };
  } catch (error) {
    console.error("更新用戶角色失敗:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "更新角色時發生錯誤" };
  }
}

/**
 * 手動授權課程存取
 */
export async function grantCourseAccess(
  data: GrantAccessData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireAdminAuth();

    // 驗證資料
    const validatedData = grantAccessSchema.parse(data);

    // 檢查用戶是否存在
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    });

    if (!user) {
      return { success: false, error: "用戶不存在" };
    }

    // 檢查課程是否存在
    const course = await prisma.course.findUnique({
      where: { id: validatedData.courseId },
    });

    if (!course) {
      return { success: false, error: "課程不存在" };
    }

    // 檢查是否已有授權記錄
    const existingPurchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: {
          userId: validatedData.userId,
          courseId: validatedData.courseId,
        },
      },
    });

    if (existingPurchase) {
      // 如果已有授權但被撤銷，則恢復授權
      if (existingPurchase.revokedAt) {
        await prisma.purchase.update({
          where: { id: existingPurchase.id },
          data: {
            revokedAt: null,
            grantedBy: currentUser.id as string,
            expiresAt: validatedData.expiresAt,
          },
        });
      } else {
        return { success: false, error: "用戶已擁有此課程的存取權限" };
      }
    } else {
      // 建立新的授權記錄
      await prisma.purchase.create({
        data: {
          userId: validatedData.userId,
          courseId: validatedData.courseId,
          grantedBy: currentUser.id as string,
          expiresAt: validatedData.expiresAt,
        },
      });
    }

    // 記錄操作日誌
    await logAdminAction(
      currentUser.id as string,
      "GRANT_ACCESS",
      validatedData.userId,
      {
        courseId: validatedData.courseId,
        courseTitle: course.title,
        expiresAt: validatedData.expiresAt,
      },
    );

    // 重新驗證頁面快取
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${validatedData.userId}`);

    return { success: true };
  } catch (error) {
    console.error("授權課程存取失敗:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "授權課程時發生錯誤" };
  }
}

/**
 * 撤銷課程存取權限
 */
export async function revokeCourseAccess(
  data: RevokeAccessData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireAdminAuth();

    // 驗證資料
    const validatedData = revokeAccessSchema.parse(data);

    // 查詢授權記錄
    const purchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: {
          userId: validatedData.userId,
          courseId: validatedData.courseId,
        },
      },
      include: {
        course: true,
      },
    });

    if (!purchase) {
      return { success: false, error: "找不到授權記錄" };
    }

    if (purchase.revokedAt) {
      return { success: false, error: "此授權已被撤銷" };
    }

    // 撤銷授權
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { revokedAt: new Date() },
    });

    // 記錄操作日誌
    await logAdminAction(
      currentUser.id as string,
      "REVOKE_ACCESS",
      validatedData.userId,
      {
        courseId: validatedData.courseId,
        courseTitle: purchase.course.title,
      },
    );

    // 重新驗證頁面快取
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${validatedData.userId}`);

    return { success: true };
  } catch (error) {
    console.error("撤銷課程存取失敗:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "撤銷課程時發生錯誤" };
  }
}

/**
 * 匯出學員列表為 CSV（根據篩選條件，不分頁）
 */
export async function exportUsersCSV(
  params: Pick<GetUsersParams, "search" | "hasPurchase">,
): Promise<string> {
  await requireAdminAuth();

  const { search, hasPurchase = "all" } = params;

  // 建立查詢條件（與 getUsers 相同邏輯）
  const where: {
    role: UserRole;
    OR?: {
      name?: { contains: string; mode: "insensitive" };
      email?: { contains: string; mode: "insensitive" };
    }[];
    purchases?: { some?: object; none?: object };
  } = {
    role: "USER",
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (hasPurchase === "yes") {
    where.purchases = { some: {} };
  } else if (hasPurchase === "no") {
    where.purchases = { none: {} };
  }

  // 查詢所有符合條件的用戶（含購買的課程名稱）
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      purchases: {
        where: { revokedAt: null },
        include: {
          course: { select: { title: true } },
        },
      },
    },
  });

  // CSV 欄位轉義（含公式注入防護）
  const escapeCsv = (value: string) => {
    let safe = value;
    // 防止 CSV Injection：開頭為公式觸發字元時加上單引號前綴
    if (/^[=+\-@\t\r]/.test(safe)) {
      safe = `'${safe}`;
    }
    if (
      safe.includes(",") ||
      safe.includes('"') ||
      safe.includes("\n") ||
      safe !== value
    ) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  };

  // 產生 CSV
  const header = "姓名,Email,電話,已購課程數,已購課程,註冊日期";
  const rows = users.map((user) => {
    const name = escapeCsv(user.name ?? "");
    const email = escapeCsv(user.email);
    const phone = user.phone ?? "-";
    const purchaseCount = user.purchases.length.toString();
    const courseNames = escapeCsv(
      user.purchases.map((p) => p.course.title).join(", "),
    );
    const createdAt = user.createdAt.toISOString().split("T")[0];

    return `${name},${email},${phone},${purchaseCount},${courseNames},${createdAt}`;
  });

  return [header, ...rows].join("\n");
}

/**
 * 取得所有可授權的課程（用於授權對話框）
 */
export async function getAvailableCourses(): Promise<
  { id: string; title: string }[]
> {
  await requireAdminAuth();

  const courses = await prisma.course.findMany({
    where: {
      status: { in: ["PUBLISHED", "UNLISTED"] },
    },
    select: {
      id: true,
      title: true,
    },
    orderBy: { title: "asc" },
  });

  return courses;
}

// ==================== 學員編輯/刪除/備註/推薦 ====================

/**
 * 編輯學員資料（姓名、Email、電話）
 */
export async function updateUser(data: UpdateUserData) {
  const admin = await requireAdminAuth();

  const parsed = updateUserSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "驗證失敗",
    };
  }

  const { userId, name, email, phone } = parsed.data;

  try {
    // 取得原始資料（供日誌比對）
    const originalUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    });

    if (!originalUser) {
      return { success: false, error: "找不到此用戶" };
    }

    // 若 email 有變更，檢查唯一性
    if (email !== originalUser.email) {
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing && existing.id !== userId) {
        return { success: false, error: "此電子郵件已被其他用戶使用" };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { name, email, phone: phone ?? null },
    });

    await logAdminAction(admin.id, "UPDATE_USER", userId, {
      before: {
        name: originalUser.name,
        email: originalUser.email,
        phone: originalUser.phone,
      },
      after: { name, email, phone: phone ?? null },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);

    return { success: true };
  } catch (error) {
    console.error("編輯學員失敗:", error);
    return { success: false, error: "編輯學員時發生錯誤" };
  }
}

/**
 * 刪除學員（僅 ADMIN 可操作）
 */
export async function deleteUser(data: DeleteUserData) {
  const admin = await requireOnlyAdminAuth();

  const parsed = deleteUserSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "驗證失敗",
    };
  }

  const { userId } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        _count: { select: { purchases: true } },
      },
    });

    if (!user) {
      return { success: false, error: "找不到此用戶" };
    }

    // 安全檢查：不可刪除 ADMIN 或 EDITOR
    if (user.role === "ADMIN" || user.role === "EDITOR") {
      return { success: false, error: "無法刪除管理員或編輯者帳號" };
    }

    // 安全檢查：不可刪除有購買記錄的用戶
    if (user._count.purchases > 0) {
      return {
        success: false,
        error: "無法刪除有購買記錄的學員，請先撤銷所有課程授權",
      };
    }

    // 安全檢查：不可刪除有訂單的用戶（Order 無直接 Prisma relation，需手動查）
    const orderCount = await prisma.order.count({
      where: { userId },
    });
    if (orderCount > 0) {
      return { success: false, error: "無法刪除有訂單記錄的學員" };
    }

    // Cascade 會自動清理 accounts/sessions/progress 等
    await prisma.user.delete({ where: { id: userId } });

    await logAdminAction(admin.id, "DELETE_USER", userId, {
      deletedUser: { name: user.name, email: user.email },
    });

    revalidatePath("/admin/users");

    return { success: true };
  } catch (error) {
    console.error("刪除學員失敗:", error);
    return { success: false, error: "刪除學員時發生錯誤" };
  }
}

/**
 * 更新管理員備註
 */
export async function updateAdminNotes(data: UpdateAdminNotesData) {
  const admin = await requireAdminAuth();

  const parsed = updateAdminNotesSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "驗證失敗",
    };
  }

  const { userId, adminNotes } = parsed.data;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { adminNotes: adminNotes ?? null },
    });

    await logAdminAction(admin.id, "UPDATE_ADMIN_NOTES", userId);

    revalidatePath(`/admin/users/${userId}`);

    return { success: true };
  } catch (error) {
    console.error("更新備註失敗:", error);
    return { success: false, error: "更新備註時發生錯誤" };
  }
}

/**
 * 課程推薦分析結果
 */
export interface CourseRecommendation {
  courseId: string;
  courseTitle: string;
  coverImage: string | null;
  price: number;
  salePrice: number | null;
  crossSellRate: number; // 0-100
  crossSellCount: number;
  totalBuyersOfSharedCourses: number;
}

/**
 * 基於交叉購買行為的課程推薦分析
 * 找出購買相同課程的其他學員 → 計算每門未購課程的交叉購買率
 */
export async function getCourseRecommendations(
  userId: string,
): Promise<CourseRecommendation[]> {
  await requireAdminAuth();

  // 1. 取得該學員已購課程 ID
  const userPurchases = await prisma.purchase.findMany({
    where: { userId, revokedAt: null },
    select: { courseId: true },
  });

  const purchasedCourseIds = userPurchases.map((p) => p.courseId);

  if (purchasedCourseIds.length === 0) {
    return [];
  }

  // 2. 找出也購買了這些課程的其他學員
  const sharedBuyers = await prisma.purchase.findMany({
    where: {
      courseId: { in: purchasedCourseIds },
      userId: { not: userId },
      revokedAt: null,
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  const sharedBuyerIds = sharedBuyers.map((b) => b.userId);

  if (sharedBuyerIds.length === 0) {
    return [];
  }

  // 3. 找出這些學員購買了哪些「該學員未購買」的課程
  const otherPurchases = await prisma.purchase.findMany({
    where: {
      userId: { in: sharedBuyerIds },
      courseId: { notIn: purchasedCourseIds },
      revokedAt: null,
    },
    select: { userId: true, courseId: true },
  });

  // 4. 計算每門未購課程的交叉購買數
  const courseCountMap = new Map<string, Set<string>>();
  for (const p of otherPurchases) {
    if (!courseCountMap.has(p.courseId)) {
      courseCountMap.set(p.courseId, new Set());
    }
    courseCountMap.get(p.courseId)!.add(p.userId);
  }

  if (courseCountMap.size === 0) {
    return [];
  }

  // 5. 取得課程資訊
  const courseIds = Array.from(courseCountMap.keys());
  const courses = await prisma.course.findMany({
    where: {
      id: { in: courseIds },
      status: { in: ["PUBLISHED", "UNLISTED"] },
    },
    select: {
      id: true,
      title: true,
      coverImage: true,
      price: true,
      salePrice: true,
    },
  });

  const totalSharedBuyers = sharedBuyerIds.length;

  // 6. 組裝結果，按交叉購買率降序排列
  const recommendations: CourseRecommendation[] = courses
    .map((course) => {
      const buyers = courseCountMap.get(course.id);
      const count = buyers?.size || 0;
      return {
        courseId: course.id,
        courseTitle: course.title,
        coverImage: course.coverImage,
        price: course.price,
        salePrice: course.salePrice,
        crossSellRate: Math.round((count / totalSharedBuyers) * 100),
        crossSellCount: count,
        totalBuyersOfSharedCourses: totalSharedBuyers,
      };
    })
    .sort((a, b) => b.crossSellRate - a.crossSellRate)
    .slice(0, 10);

  return recommendations;
}
