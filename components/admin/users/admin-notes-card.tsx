// components/admin/users/admin-notes-card.tsx
// 管理員備註卡片
// 可編輯的備註區域，支援 dirty check

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateAdminNotes } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Loader2, Save } from "lucide-react";

interface AdminNotesCardProps {
  userId: string;
  initialNotes: string | null;
}

export function AdminNotesCard({ userId, initialNotes }: AdminNotesCardProps) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(initialNotes || "");
  const savedNotes = initialNotes || "";
  const isDirty = notes !== savedNotes;

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await updateAdminNotes({
          userId,
          adminNotes: notes.trim() || null,
        });

        if (result.success) {
          toast.success("備註已儲存");
        } else {
          toast.error(result.error ?? "儲存失敗");
        }
      } catch {
        toast.error("儲存備註時發生錯誤");
      }
    });
  };

  return (
    <Card className="border-[#E5E5E5] rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#0A0A0A] flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-[#C41E3A]" />
            管理員備註
          </CardTitle>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isPending}
            className="bg-[#C41E3A] hover:bg-[#A01830] rounded-lg disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                儲存中
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                儲存
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="在此記錄關於此學員的備註..."
          rows={4}
          maxLength={5000}
          className="bg-white border-[#E5E5E5] text-[#0A0A0A] rounded-lg resize-none placeholder:text-[#A3A3A3]"
        />
        <p className="text-xs text-[#A3A3A3] mt-2 text-right">
          {notes.length} / 5000
        </p>
      </CardContent>
    </Card>
  );
}
