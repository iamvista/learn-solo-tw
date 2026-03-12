// components/admin/users/edit-user-dialog.tsx
// 編輯學員資料對話框
// 允許管理員編輯學員的姓名、Email、電話

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateUser } from "@/lib/actions/users";
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
import { Input } from "@/components/ui/input";
import { Pencil, Loader2 } from "lucide-react";

interface EditUserDialogProps {
  userId: string;
  currentName: string | null;
  currentEmail: string;
  currentPhone: string | null;
}

export function EditUserDialog({
  userId,
  currentName,
  currentEmail,
  currentPhone,
}: EditUserDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName || "");
  const [email, setEmail] = useState(currentEmail);
  const [phone, setPhone] = useState(currentPhone || "");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      // 重置為目前值
      setName(currentName || "");
      setEmail(currentEmail);
      setPhone(currentPhone || "");
    }
    setOpen(isOpen);
  };

  const handleConfirm = () => {
    if (!name.trim()) {
      toast.error("姓名不可為空");
      return;
    }
    if (!email.trim()) {
      toast.error("Email 不可為空");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateUser({
          userId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
        });

        if (result.success) {
          toast.success("學員資料已更新");
          setOpen(false);
          router.refresh();
        } else {
          toast.error(result.error ?? "更新失敗");
        }
      } catch {
        toast.error("更新學員資料時發生錯誤");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
        >
          <Pencil className="mr-2 h-4 w-4" />
          編輯資料
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-[#E5E5E5] rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-[#0A0A0A]">編輯學員資料</DialogTitle>
          <DialogDescription className="text-[#525252]">
            修改學員的基本資料。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-[#0A0A0A] mb-2 block">
              姓名 <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="請輸入姓名"
              className="bg-white border-[#E5E5E5] text-[#0A0A0A] rounded-lg"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#0A0A0A] mb-2 block">
              電子郵件 <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="請輸入 Email"
              className="bg-white border-[#E5E5E5] text-[#0A0A0A] rounded-lg"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#0A0A0A] mb-2 block">
              電話
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="選填"
              className="bg-white border-[#E5E5E5] text-[#0A0A0A] rounded-lg"
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
            disabled={isPending || !name.trim() || !email.trim()}
            className="bg-[#C41E3A] hover:bg-[#A01830] rounded-lg"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                儲存中...
              </>
            ) : (
              "儲存"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
