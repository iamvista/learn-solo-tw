// components/admin/users/delete-user-dialog.tsx
// 刪除學員對話框
// 僅 ADMIN 可操作，有購買記錄的學員無法刪除

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteUser } from "@/lib/actions/users";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteUserDialogProps {
  userId: string;
  userName: string | null;
  userEmail: string;
  hasPurchases: boolean;
}

export function DeleteUserDialog({
  userId,
  userName,
  userEmail,
  hasPurchases,
}: DeleteUserDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        const result = await deleteUser({ userId });

        if (result.success) {
          toast.success("學員已刪除");
          router.push("/admin/users");
        } else {
          toast.error(result.error ?? "刪除失敗");
        }
      } catch {
        toast.error("刪除學員時發生錯誤");
      }
    });
  };

  const displayName = userName || userEmail;

  const triggerButton = (
    <Button
      variant="outline"
      size="sm"
      disabled={hasPurchases}
      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg disabled:opacity-50"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      刪除學員
    </Button>
  );

  if (hasPurchases) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
          <TooltipContent>
            <p>有購買記錄的學員無法刪除</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setConfirmText("");
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="bg-white border-[#E5E5E5] rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-[#0A0A0A]">確認刪除學員</DialogTitle>
          <DialogDescription className="text-[#525252]">
            即將刪除學員「{displayName}
            」。此操作無法復原，該學員的帳號、學習進度等資料將永久刪除。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium">請確認以下事項：</p>
            <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
              <li>該學員沒有任何購買記錄</li>
              <li>該學員的帳號和所有相關資料將永久刪除</li>
              <li>此操作無法復原</li>
            </ul>
          </div>

          <div>
            <label className="text-sm font-medium text-[#0A0A0A] mb-2 block">
              請輸入學員 Email{" "}
              <span className="font-mono text-red-600">{userEmail}</span>{" "}
              以確認刪除
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={userEmail}
              className="bg-white border-[#E5E5E5] text-[#0A0A0A] rounded-lg font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || confirmText !== userEmail}
            variant="destructive"
            className="rounded-lg"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                刪除中...
              </>
            ) : (
              "確認刪除"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
