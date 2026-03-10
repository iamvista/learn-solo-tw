/* eslint-disable @next/next/no-img-element */
// components/admin/media/video-card.tsx
// 影片卡片元件
// 顯示影片縮圖、狀態和操作按鈕

"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Play,
  Copy,
  Trash2,
  MoreVertical,
  Clock,
  Calendar,
  CheckCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  deleteMedia,
  syncMediaInfo,
  renameMedia,
  checkMediaUsage,
} from "@/lib/actions/media";
import { cn } from "@/lib/utils";
import type { Media } from "@prisma/client";

interface VideoCardProps {
  video: Media;
  onDelete?: (id: string) => void;
  onSelect?: (video: Media) => void;
  onSync?: (updatedVideo: Media) => void;
  selectable?: boolean;
  selected?: boolean;
  streamCustomerCode?: string;
}

export function VideoCard({
  video,
  onDelete,
  onSelect,
  onSync,
  selectable = false,
  selected = false,
  streamCustomerCode,
}: VideoCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [currentVideo, setCurrentVideo] = useState(video);
  const [usages, setUsages] = useState<
    { lessonTitle: string; chapterTitle: string; courseTitle: string }[]
  >([]);

  // 根據 cfStreamId 動態生成縮圖 URL
  const getThumbnailUrl = () => {
    if (currentVideo.cfStreamId && streamCustomerCode) {
      return `https://customer-${streamCustomerCode}.cloudflarestream.com/${currentVideo.cfStreamId}/thumbnails/thumbnail.jpg?height=270`;
    }
    return currentVideo.thumbnail;
  };

  // 格式化時長
  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds === undefined || seconds < 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // 同步影片資訊
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncMediaInfo(currentVideo.id);
      if (result.success && result.media) {
        setCurrentVideo(result.media);
        onSync?.(result.media);
        toast.success("影片資訊已同步");
      } else {
        toast.error(result.error || "同步失敗");
      }
    } catch {
      toast.error("同步時發生錯誤");
    } finally {
      setIsSyncing(false);
    }
  };

  // 判斷是否需要同步（沒有 duration 或狀態不是 ready）
  const needsSync = !currentVideo.duration || currentVideo.cfStatus !== "ready";

  // 自動輪詢：當影片需要同步時（上傳後處理中），自動每 5 秒檢查一次
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    if (!needsSync || !currentVideo.cfStreamId) return;

    const maxPolls = 60; // 最多輪詢 60 次（5 分鐘）

    const poll = async () => {
      if (pollCountRef.current >= maxPolls) return;
      pollCountRef.current++;

      try {
        const response = await fetch(`/api/admin/media/${currentVideo.id}/status`);
        const data = await response.json();

        if (data.success && data.media?.duration) {
          setCurrentVideo((prev) => ({
            ...prev,
            duration: data.media.duration,
            cfStatus: data.media.cfStatus || "ready",
          }));
          onSync?.({
            ...currentVideo,
            duration: data.media.duration,
            cfStatus: data.media.cfStatus || "ready",
          });
          return; // 成功取得 duration，停止輪詢
        }
      } catch {
        // 輪詢失敗，靜默繼續
      }

      // 繼續輪詢
      pollTimerRef.current = setTimeout(poll, 5000);
    };

    // 延遲 3 秒後開始第一次輪詢（給影片處理一些時間）
    pollTimerRef.current = setTimeout(poll, 3000);

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [needsSync, currentVideo.cfStreamId, currentVideo.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 格式化日期
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // 取得狀態標籤
  const getStatusBadge = () => {
    switch (currentVideo.cfStatus) {
      case "ready":
        return (
          <Badge className="bg-green-50 text-green-600 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            就緒
          </Badge>
        );
      case "pending":
      case "inprogress":
        return (
          <Badge className="bg-[#F5A524]/10 text-[#F5A524] border-[#F5A524]/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            編碼中
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-50 text-red-600 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            錯誤
          </Badge>
        );
      default:
        return (
          <Badge
            variant="secondary"
            className="bg-[#FAFAFA] text-[#525252] border-[#E5E5E5]"
          >
            未知
          </Badge>
        );
    }
  };

  // 複製 Video ID
  const handleCopyId = () => {
    if (currentVideo.cfStreamId) {
      navigator.clipboard.writeText(currentVideo.cfStreamId);
      toast.success("已複製 Video ID");
    }
  };

  // 點擊刪除按鈕時，先檢查使用情況
  const handleDeleteClick = async () => {
    setIsCheckingUsage(true);
    try {
      const result = await checkMediaUsage(currentVideo.id);
      if (result.success) {
        setUsages(result.usages ?? []);
      } else {
        setUsages([]);
      }
    } catch {
      setUsages([]);
    } finally {
      setIsCheckingUsage(false);
      setShowDeleteDialog(true);
    }
  };

  // 刪除影片
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteMedia(currentVideo.id);
      if (result.success) {
        toast.success("影片已刪除");
        onDelete?.(currentVideo.id);
      } else {
        toast.error(result.error || "刪除失敗");
      }
    } catch (error) {
      toast.error("刪除時發生錯誤");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // 重新命名影片
  const handleRename = async () => {
    if (!renameName.trim()) return;
    setIsRenaming(true);
    try {
      const result = await renameMedia(currentVideo.id, renameName.trim());
      if (result.success && result.media) {
        setCurrentVideo(result.media);
        toast.success("影片已重新命名");
        setShowRenameDialog(false);
      } else {
        toast.error(result.error || "重新命名失敗");
      }
    } catch {
      toast.error("重新命名時發生錯誤");
    } finally {
      setIsRenaming(false);
    }
  };

  // 處理點擊（選擇模式）
  const handleClick = () => {
    if (selectable) {
      onSelect?.(video);
    }
  };

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden bg-white border-[#E5E5E5] rounded-xl transition-all",
          selectable && "cursor-pointer hover:border-[#F5A524]",
          selected && "ring-2 ring-[#F5A524] border-[#F5A524]"
        )}
        onClick={handleClick}
      >
        {/* 縮圖 */}
        <div className="aspect-video relative bg-[#FAFAFA]">
          {getThumbnailUrl() ? (
            <img
              src={getThumbnailUrl()!}
              alt={currentVideo.originalName}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-12 h-12 text-[#A3A3A3]" />
            </div>
          )}

          {/* 狀態標籤 */}
          <div className="absolute top-2 left-2">{getStatusBadge()}</div>

          {/* 時長 */}
          {currentVideo.duration && currentVideo.duration > 0 && (
            <div className="absolute bottom-2 right-2 bg-[#0A0A0A]/70 rounded-lg px-2 py-1">
              <span className="text-white text-xs font-medium">
                {formatDuration(currentVideo.duration)}
              </span>
            </div>
          )}

          {/* 同步按鈕（當需要同步時顯示） */}
          {needsSync && !selectable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSync();
              }}
              disabled={isSyncing}
              className="absolute bottom-2 left-2 bg-[#0A0A0A]/70 hover:bg-[#0A0A0A]/90 text-white text-xs h-7 px-2 rounded-lg"
            >
              {isSyncing ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              同步
            </Button>
          )}

          {/* 選中標記 */}
          {selectable && selected && (
            <div className="absolute top-2 right-2">
              <div className="w-6 h-6 rounded-full bg-[#F5A524] flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* 資訊 */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-[#0A0A0A] font-medium truncate">
                {currentVideo.originalName}
              </h3>
              <div className="flex items-center gap-4 mt-2 text-[#A3A3A3] text-sm">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(currentVideo.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(currentVideo.createdAt)}
                </span>
              </div>
            </div>

            {/* 操作選單 */}
            {!selectable && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-white border-[#E5E5E5] rounded-lg"
                >
                  <DropdownMenuItem
                    onClick={() => {
                      setRenameName(currentVideo.originalName);
                      setShowRenameDialog(true);
                    }}
                    className="text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    重新命名
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleCopyId}
                    className="text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    複製 Video ID
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 hover:bg-red-50"
                    onClick={handleDeleteClick}
                    disabled={isCheckingUsage}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isCheckingUsage ? "檢查中..." : "刪除影片"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </Card>

      {/* 重新命名對話框 */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="bg-white border-[#E5E5E5] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0A0A0A]">重新命名影片</DialogTitle>
            <DialogDescription className="text-[#525252]">
              輸入新的影片名稱
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            placeholder="輸入影片名稱"
            className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3]"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRenameDialog(false)}
              disabled={isRenaming}
              className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
            >
              取消
            </Button>
            <Button
              onClick={handleRename}
              disabled={isRenaming || !renameName.trim()}
              className="bg-[#F5A524] hover:bg-[#E09000] text-white rounded-lg"
            >
              {isRenaming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  儲存中...
                </>
              ) : (
                "確認"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white border-[#E5E5E5] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#0A0A0A]">確認刪除影片</DialogTitle>
            <DialogDescription className="text-[#525252]">
              確定要刪除影片「{currentVideo.originalName}」嗎？此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          {usages.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-sm font-medium text-amber-800">
                <AlertCircle className="w-4 h-4 inline mr-1 -mt-0.5" />
                此影片正被 {usages.length} 個單元使用中
              </p>
              <ul className="text-xs text-amber-700 space-y-1 ml-5 list-disc">
                {usages.map((u, i) => (
                  <li key={i}>
                    {u.courseTitle} &gt; {u.chapterTitle} &gt; {u.lessonTitle}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-600">
                刪除後，這些單元的影片將無法播放。
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-lg"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  刪除中...
                </>
              ) : (
                "確認刪除"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
