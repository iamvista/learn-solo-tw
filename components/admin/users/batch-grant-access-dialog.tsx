// components/admin/users/batch-grant-access-dialog.tsx
// 批次授權課程對話框
// 一次為多位學員授權課程存取

"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getAvailableCourses, grantCourseAccess } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookPlus, Loader2, CheckCircle, XCircle } from "lucide-react";

interface BatchGrantAccessDialogProps {
  selectedUsers: { id: string; name: string | null; email: string }[];
  onComplete: () => void;
}

export function BatchGrantAccessDialog({
  selectedUsers,
  onComplete,
}: BatchGrantAccessDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [results, setResults] = useState<
    { userId: string; success: boolean; error?: string }[] | null
  >(null);

  useEffect(() => {
    if (open) {
      getAvailableCourses().then(setCourses);
      setSelectedCourseId("");
      setResults(null);
    }
  }, [open]);

  const handleConfirm = () => {
    if (!selectedCourseId) {
      toast.error("請選擇要授權的課程");
      return;
    }

    startTransition(async () => {
      const batchResults: {
        userId: string;
        success: boolean;
        error?: string;
      }[] = [];

      for (const user of selectedUsers) {
        try {
          const result = await grantCourseAccess({
            userId: user.id,
            courseId: selectedCourseId,
          });
          batchResults.push({
            userId: user.id,
            success: result.success,
            error: result.error,
          });
        } catch {
          batchResults.push({
            userId: user.id,
            success: false,
            error: "授權時發生錯誤",
          });
        }
      }

      setResults(batchResults);

      const successCount = batchResults.filter((r) => r.success).length;
      const failCount = batchResults.length - successCount;

      if (failCount === 0) {
        toast.success(`已成功為 ${successCount} 位學員授權課程`);
      } else {
        toast.warning(
          `${successCount} 位成功，${failCount} 位失敗（可能已擁有該課程）`,
        );
      }

      router.refresh();
    });
  };

  const handleClose = () => {
    setOpen(false);
    if (results) onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-[#C41E3A] hover:bg-[#A01830] rounded-lg"
        >
          <BookPlus className="mr-1.5 h-3.5 w-3.5" />
          批次授權課程
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-[#E5E5E5] rounded-xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#0A0A0A]">批次授權課程</DialogTitle>
          <DialogDescription className="text-[#525252]">
            為 {selectedUsers.length} 位學員授權課程存取權限
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 選取的學員列表 */}
          <div>
            <label className="text-sm font-medium text-[#0A0A0A] mb-2 block">
              選取的學員
            </label>
            <div className="max-h-32 overflow-y-auto rounded-lg border border-[#E5E5E5] p-2 space-y-1">
              {selectedUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-2 text-sm">
                  {results && (
                    <>
                      {results.find((r) => r.userId === user.id)?.success ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                      )}
                    </>
                  )}
                  <span className="text-[#0A0A0A] truncate">
                    {user.name || "未設定姓名"}
                  </span>
                  <span className="text-[#A3A3A3] text-xs truncate">
                    {user.email}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 課程選擇 */}
          {!results && (
            <div>
              <label className="text-sm font-medium text-[#0A0A0A] mb-2 block">
                選擇要授權的課程
              </label>
              <Select
                value={selectedCourseId}
                onValueChange={setSelectedCourseId}
              >
                <SelectTrigger className="bg-white border-[#E5E5E5] text-[#0A0A0A] rounded-lg">
                  <SelectValue placeholder="選擇課程..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          {results ? (
            <Button
              onClick={handleClose}
              className="bg-[#C41E3A] hover:bg-[#A01830] rounded-lg"
            >
              完成
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
              >
                取消
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isPending || !selectedCourseId}
                className="bg-[#C41E3A] hover:bg-[#A01830] rounded-lg"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    授權中...
                  </>
                ) : (
                  "確認授權"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
