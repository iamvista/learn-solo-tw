// components/admin/comments/comment-reply-modal.tsx
// 留言回覆 Modal：Milkdown 編輯器 + 發送留言/Email 勾選

'use client'

import { useState, useTransition, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  Send,
  MessageCircle,
  Mail,
  Copy,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { replyToLessonComment } from '@/lib/actions/lesson-comment-reply'
import { COMMENT_REPLY_VARIABLES } from '@/lib/comment-reply'
import { MilkdownSimpleEditor } from '@/components/admin/comments/milkdown-simple-editor'

interface CommentInfo {
  id: string
  content: string
  userName: string
  userEmail: string
  lessonTitle: string
  courseTitle: string
}

interface CommentReplyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comment: CommentInfo | null
  onSuccess?: () => void
}

export function CommentReplyModal({
  open,
  onOpenChange,
  comment,
  onSuccess,
}: CommentReplyModalProps) {
  const [isPending, startTransition] = useTransition()
  const [subject, setSubject] = useState('回覆您在「{{課程名稱}}」的留言')
  const [markdownContent, setMarkdownContent] = useState('')
  const [sendAsComment, setSendAsComment] = useState(false)
  const [sendAsEmail, setSendAsEmail] = useState(true)

  // 每次開啟 modal 重置編輯器
  const [editorKey, setEditorKey] = useState(0)

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setMarkdownContent('')
        setSubject('回覆您在「{{課程名稱}}」的留言')
        setSendAsComment(false)
        setSendAsEmail(true)
        setEditorKey((k) => k + 1)
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange]
  )

  const handleSubmit = () => {
    if (!comment) return

    startTransition(async () => {
      const result = await replyToLessonComment({
        commentId: comment.id,
        markdownContent,
        subject,
        sendAsComment,
        sendAsEmail,
      })

      if (result.success) {
        toast.success('回覆已發送')
        handleOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error ?? '回覆失敗')
      }
    })
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token)
      toast.success(`已複製 ${token}`)
    } catch {
      toast.error('複製失敗')
    }
  }

  // 預覽用 context
  const previewSubject = useMemo(() => {
    if (!comment) return subject
    return subject
      .replace(/\{\{用戶名稱\}\}/g, comment.userName)
      .replace(/\{\{課程名稱\}\}/g, comment.courseTitle)
      .replace(/\{\{單元名稱\}\}/g, comment.lessonTitle)
      .replace(/\{\{原始留言\}\}/g, comment.content)
  }, [subject, comment])

  if (!comment) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white border-[#E5E5E5] rounded-xl sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#0A0A0A] flex items-center gap-2">
            <Send className="h-5 w-5 text-[#F5A524]" />
            回覆留言
          </DialogTitle>
        </DialogHeader>

        {/* 原始留言資訊 */}
        <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <UserRound className="h-4 w-4 text-[#A3A3A3]" />
            <span className="font-semibold text-[#0A0A0A]">{comment.userName}</span>
            <span className="text-[#A3A3A3]">·</span>
            <span className="text-[#525252]">{comment.userEmail}</span>
          </div>
          <div className="text-xs text-[#737373]">
            {comment.courseTitle} · {comment.lessonTitle}
          </div>
          <div className="whitespace-pre-wrap break-words rounded-lg bg-white border border-[#E5E5E5] px-3 py-2 text-sm text-[#0A0A0A]">
            {comment.content}
          </div>
        </div>

        {/* 主內容區：左側編輯 + 右側關鍵字 */}
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
          {/* 左側：編輯區 */}
          <div className="space-y-4">
            {/* 信件標題 (只有勾選 Email 時顯示) */}
            {sendAsEmail && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#0A0A0A]">
                  信件標題
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-white border-[#E5E5E5] text-[#0A0A0A]"
                  placeholder="信件標題"
                />
                {previewSubject !== subject && (
                  <p className="text-xs text-[#A3A3A3]">
                    預覽：{previewSubject}
                  </p>
                )}
              </div>
            )}

            {/* Milkdown 編輯器 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0A0A0A]">
                回覆內容
              </label>
              <MilkdownSimpleEditor
                key={editorKey}
                value={markdownContent}
                onChange={setMarkdownContent}
                placeholder="輸入回覆內容..."
                minHeight="200px"
              />
            </div>

            {/* 發送方式勾選 */}
            <div className="rounded-xl border border-[#E5E5E5] p-4 space-y-3">
              <p className="text-sm font-medium text-[#0A0A0A]">發送方式</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={sendAsComment}
                    onCheckedChange={(checked) =>
                      setSendAsComment(checked === true)
                    }
                  />
                  <MessageCircle className="h-4 w-4 text-[#525252]" />
                  <span className="text-sm text-[#0A0A0A]">發送留言</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={sendAsEmail}
                    onCheckedChange={(checked) =>
                      setSendAsEmail(checked === true)
                    }
                  />
                  <Mail className="h-4 w-4 text-[#525252]" />
                  <span className="text-sm text-[#0A0A0A]">發送電子郵件給 {comment.userEmail}</span>
                </label>
              </div>
            </div>
          </div>

          {/* 右側：可用關鍵字 */}
          <div className="space-y-3">
            <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-3">
              <p className="text-sm font-medium text-[#0A0A0A]">可用關鍵字</p>
              <p className="mt-1 text-xs text-[#737373]">
                點擊複製，貼到標題或內容中。
              </p>
            </div>

            {COMMENT_REPLY_VARIABLES.map((variable) => (
              <div
                key={variable.token}
                className="flex flex-col gap-1.5 rounded-lg border border-[#E5E5E5] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <Badge
                      variant="outline"
                      className="text-[#0A0A0A] border-[#E5E5E5] max-w-full break-all whitespace-normal"
                    >
                      {variable.token}
                    </Badge>
                    <p className="text-xs text-[#525252]">{variable.label}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-[#E5E5E5] shrink-0"
                    onClick={() => copyToken(variable.token)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    複製
                  </Button>
                </div>
                <p className="text-xs text-[#A3A3A3]">
                  範例：{variable.example}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || (!sendAsComment && !sendAsEmail)}
            className="bg-[#F5A524] hover:bg-[#E09000] text-white rounded-lg"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                發送中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                發送回覆
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
