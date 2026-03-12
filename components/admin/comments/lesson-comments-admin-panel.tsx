// components/admin/comments/lesson-comments-admin-panel.tsx
// 課程內：依「選中的單元」管理留言

'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Trash2, Loader2, MessageCircle, UserRound, ShieldOff, Reply } from 'lucide-react'
import { useCourseEditor } from '@/lib/contexts/course-editor-context'
import {
  deleteLessonCommentForAdmin,
  getLessonCommentsForAdminByLesson,
  type AdminLessonComment,
} from '@/lib/actions/lesson-comments-admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CommentReplyModal } from '@/components/admin/comments/comment-reply-modal'

export function LessonCommentsAdminPanel() {
  const { selectedLessonId, selectedLesson, course } = useCourseEditor()
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState<AdminLessonComment[]>([])
  const [isPending, startTransition] = useTransition()

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<AdminLessonComment | null>(
    null
  )
  const [replyOpen, setReplyOpen] = useState(false)
  const [commentToReply, setCommentToReply] = useState<AdminLessonComment | null>(null)

  const title = useMemo(() => {
    if (!selectedLesson) return '請先在左側選擇單元'
    return selectedLesson.title
  }, [selectedLesson])

  const load = useCallback(async (lessonId: string) => {
    setLoading(true)
    try {
      const list = await getLessonCommentsForAdminByLesson(lessonId)
      setComments(list)
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : '取得留言失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedLessonId) {
      setComments([])
      return
    }
    load(selectedLessonId)
  }, [selectedLessonId, load])

  const handleDelete = async () => {
    if (!commentToDelete) return
    startTransition(async () => {
      const res = await deleteLessonCommentForAdmin({
        commentId: commentToDelete.id,
        revalidate: { courseId: course?.id },
      })
      if (res.success) {
        toast.success('留言已刪除')
        setDeleteOpen(false)
        if (selectedLessonId) await load(selectedLessonId)
      } else {
        toast.error(res.error ?? '刪除留言失敗')
      }
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-[#0A0A0A] flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#C41E3A]" />
            單元留言管理
          </h1>
          <p className="mt-1 text-sm text-[#525252] truncate">
            {title}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => selectedLessonId && load(selectedLessonId)}
          disabled={!selectedLessonId || loading}
          className="border-[#E5E5E5] text-[#525252] hover:bg-white hover:text-[#0A0A0A] rounded-lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              載入中...
            </>
          ) : (
            '更新'
          )}
        </Button>
      </div>

      {!selectedLessonId ? (
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 text-sm text-[#525252]">
          請在左側大綱選擇要管理的單元。
        </div>
      ) : (
        <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
          <div className="border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-[#525252]">
              共 {comments.length} 則（含已刪除）
            </div>
          </div>

          <div className="divide-y divide-[#E5E5E5]">
            {comments.length === 0 && !loading ? (
              <div className="px-6 py-10 text-center text-sm text-[#A3A3A3]">
                目前沒有留言
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#0A0A0A] flex items-center gap-1.5">
                          <UserRound className="h-4 w-4 text-[#A3A3A3]" />
                          {c.isAnonymous ? '學員（匿名）' : c.user.name || '未命名'}
                        </span>
                        {c.isAnonymous && (
                          <Badge className="bg-[#C41E3A]/10 text-[#C41E3A] hover:bg-[#C41E3A]/10">
                            <ShieldOff className="mr-1 h-3 w-3" />
                            匿名
                          </Badge>
                        )}
                        {c.deletedAt && (
                          <Badge
                            variant="secondary"
                            className="bg-red-50 text-red-600 hover:bg-red-50"
                          >
                            已刪除
                          </Badge>
                        )}
                        <span className="text-xs text-[#A3A3A3]">
                          {format(new Date(c.createdAt), 'yyyy/MM/dd HH:mm')}
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-[#525252]">
                        真實身份：{c.user.name || '未命名'} · {c.user.email}
                      </div>

                      <div className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] px-4 py-3 text-sm text-[#0A0A0A]">
                        {c.content}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        disabled={!!c.deletedAt}
                        onClick={() => {
                          setCommentToReply(c)
                          setReplyOpen(true)
                        }}
                        className="border-[#C41E3A]/30 text-[#C41E3A] hover:bg-[#C41E3A]/5 hover:text-[#A01830] rounded-lg"
                      >
                        <Reply className="mr-2 h-4 w-4" />
                        回覆
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!!c.deletedAt}
                        onClick={() => {
                          setCommentToDelete(c)
                          setDeleteOpen(true)
                        }}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        刪除
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <CommentReplyModal
        open={replyOpen}
        onOpenChange={setReplyOpen}
        comment={
          commentToReply
            ? {
                id: commentToReply.id,
                content: commentToReply.content,
                userName: commentToReply.user.name || '未命名',
                userEmail: commentToReply.user.email,
                lessonTitle: commentToReply.lesson.title,
                courseTitle: commentToReply.lesson.chapter.course.title,
              }
            : null
        }
        onSuccess={() => selectedLessonId && load(selectedLessonId)}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#0A0A0A]">確認刪除留言</DialogTitle>
            <DialogDescription className="text-[#525252]">
              此操作會將留言標記為已刪除，前台不再顯示。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 rounded-lg"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  刪除中...
                </>
              ) : (
                '確認刪除'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
