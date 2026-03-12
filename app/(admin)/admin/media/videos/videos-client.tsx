// app/(admin)/admin/media/videos/videos-client.tsx
// 影片管理客戶端元件
// 處理搜尋、上傳和刪除操作

"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VideoCard } from "@/components/admin/media/video-card";
import { VideoUpload } from "@/components/admin/media/video-upload";
import { Search, Upload, Film, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { GetMediaResult } from "@/lib/actions/media";

interface VideosClientProps {
  initialData: GetMediaResult;
  searchQuery?: string;
  streamCustomerCode: string;
}

export function VideosClient({
  initialData,
  searchQuery,
  streamCustomerCode,
}: VideosClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchQuery || "");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [data, setData] = useState(initialData);

  // 建立查詢字串
  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const current = new URLSearchParams(searchParams.toString());

      Object.entries(params).forEach(([key, value]) => {
        if (value === null) {
          current.delete(key);
        } else {
          current.set(key, value);
        }
      });

      return current.toString();
    },
    [searchParams],
  );

  // 處理搜尋
  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);

      const timeoutId = setTimeout(() => {
        startTransition(() => {
          const query = createQueryString({
            search: value || null,
            page: null, // 重置頁碼
          });
          router.push(`${pathname}?${query}`);
        });
      }, 300);

      return () => clearTimeout(timeoutId);
    },
    [createQueryString, pathname, router],
  );

  // 處理分頁
  const handlePageChange = (page: number) => {
    startTransition(() => {
      const query = createQueryString({
        page: page.toString(),
      });
      router.push(`${pathname}?${query}`);
    });
  };

  // 處理刪除
  const handleDelete = (id: string) => {
    setData((prev) => ({
      ...prev,
      media: prev.media.filter((item) => item.id !== id),
      total: prev.total - 1,
    }));
  };

  // 追蹤批次上傳數量
  const [uploadCount, setUploadCount] = useState(0);

  // 處理單個影片上傳完成
  const handleUploadComplete = () => {
    setUploadCount((prev) => prev + 1);
  };

  // 關閉上傳對話框時重新整理
  const handleUploadDialogClose = (open: boolean) => {
    setShowUploadDialog(open);
    if (!open && uploadCount > 0) {
      toast.success(`${uploadCount} 部影片上傳成功，正在處理中...`);
      setUploadCount(0);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* 工具列 */}
      <div className="flex items-center gap-4">
        {/* 搜尋 */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
          <Input
            placeholder="搜尋影片..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#C41E3A] focus:ring-[#C41E3A]"
          />
        </div>

        {/* 上傳按鈕 */}
        <Dialog open={showUploadDialog} onOpenChange={handleUploadDialogClose}>
          <DialogTrigger asChild>
            <Button className="bg-[#C41E3A] hover:bg-[#A01830] text-white rounded-lg">
              <Upload className="w-4 h-4 mr-2" />
              上傳影片
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-[#E5E5E5] max-w-2xl rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-[#0A0A0A]">
                批次上傳影片
                {uploadCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-[#C41E3A]">
                    （已完成 {uploadCount} 部）
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-[#525252]">
              支援一次選取或拖放多個影片檔案
            </p>
            <VideoUpload
              onUploadComplete={handleUploadComplete}
              onError={(error) => toast.error(error)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* 影片列表 */}
      {data.media.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Film className="w-16 h-16 text-[#A3A3A3] mb-4" />
          <h3 className="text-xl font-medium text-[#0A0A0A] mb-2">
            {search ? "沒有找到符合的影片" : "還沒有上傳任何影片"}
          </h3>
          <p className="text-[#525252] mb-6">
            {search
              ? "請嘗試其他搜尋關鍵字"
              : "點擊上方按鈕開始上傳您的第一支影片"}
          </p>
          {!search && (
            <Button
              className="bg-[#C41E3A] hover:bg-[#A01830] text-white rounded-lg"
              onClick={() => setShowUploadDialog(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              上傳影片
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* 影片網格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.media.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onDelete={handleDelete}
                streamCustomerCode={streamCustomerCode}
              />
            ))}
          </div>

          {/* 分頁 */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-[#525252] text-sm">
                共 {data.total} 部影片，第 {data.page} / {data.totalPages} 頁
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.page - 1)}
                  disabled={data.page <= 1 || isPending}
                  className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一頁
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.page + 1)}
                  disabled={data.page >= data.totalPages || isPending}
                  className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
                >
                  下一頁
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
