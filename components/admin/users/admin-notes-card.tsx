// components/admin/users/admin-notes-card.tsx
// 管理員備註卡片
// 可編輯的備註區域，支援 dirty check + 修改歷史

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateAdminNotes } from "@/lib/actions/users";
import type { AdminNotesHistoryItem } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Loader2, Save, History, ChevronDown } from "lucide-react";

interface AdminNotesCardProps {
  userId: string;
  initialNotes: string | null;
  history?: AdminNotesHistoryItem[];
}

export function AdminNotesCard({
  userId,
  initialNotes,
  history = [],
}: AdminNotesCardProps) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(initialNotes || "");
  const [savedNotes, setSavedNotes] = useState(initialNotes || "");
  const [showHistory, setShowHistory] = useState(false);
  const isDirty = notes !== savedNotes;

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await updateAdminNotes({
          userId,
          adminNotes: notes.trim() || null,
        });

        if (result.success) {
          setSavedNotes(notes.trim() || "");
          toast.success("備註已儲存");
        } else {
          toast.error(result.error ?? "儲存失敗");
        }
      } catch {
        toast.error("儲存備註時發生錯誤");
      }
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("zh-TW", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
      <CardContent className="space-y-3">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="在此記錄關於此學員的備註..."
          rows={4}
          maxLength={5000}
          className="bg-white border-[#E5E5E5] text-[#0A0A0A] rounded-lg resize-none placeholder:text-[#A3A3A3]"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#A3A3A3]">
            {notes.length} / 5000
          </p>
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-xs text-[#A3A3A3] hover:text-[#525252] transition-colors"
            >
              <History className="h-3 w-3" />
              修改紀錄 ({history.length})
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showHistory ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>

        {/* 修改歷史 */}
        {showHistory && history.length > 0 && (
          <div className="border-t border-[#E5E5E5] pt-3 space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="text-xs text-[#525252] flex items-start gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#A3A3A3] mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="font-medium text-[#0A0A0A]">
                    {item.adminName}
                  </span>
                  <span className="text-[#A3A3A3] ml-1">
                    {formatDate(item.createdAt)}
                  </span>
                  {item.notes !== null && (
                    <p className="text-[#525252] mt-0.5 line-clamp-2">
                      {item.notes || "（清除備註）"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
