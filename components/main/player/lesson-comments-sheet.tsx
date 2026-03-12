// components/main/player/lesson-comments-sheet.tsx
// 單元評論/留言（Messenger 風格）

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { format, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  MessageCircle,
  RefreshCcw,
  Send,
  UserRound,
  ShieldOff,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type LessonCommentDTO = {
  id: string
  lessonId: string
  content: string
  isAnonymous: boolean
  createdAt: string
  user: { id: string; name: string | null; image: string | null }
}

interface LessonCommentsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lessonId: string
  lessonTitle: string
  chapterTitle: string
}

export function LessonCommentsSheet({
  open,
  onOpenChange,
  lessonId,
  lessonTitle,
  chapterTitle,
}: LessonCommentsSheetProps) {
  const { data: session } = useSession()
  const [isMobile, setIsMobile] = useState(false)

  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [comments, setComments] = useState<LessonCommentDTO[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sync = () => setIsMobile(window.innerWidth < 768)
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const canSend = useMemo(() => {
    if (!session?.user?.id) return false
    if (!content.trim()) return false
    if (sending) return false
    if (cooldownUntil && now < cooldownUntil) return false
    return true
  }, [session?.user?.id, content, sending, cooldownUntil, now])

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return isToday(d) ? format(d, 'HH:mm') : format(d, 'MM/dd HH:mm')
  }

  const fetchLatest = async () => {
    if (!session?.user?.id) {
      setComments([])
      setNextCursor(null)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `/api/lesson-comments?lessonId=${encodeURIComponent(lessonId)}&limit=50`,
        { method: 'GET' }
      )
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || '取得留言失敗')
      }

      const list = (json.comments as LessonCommentDTO[]).slice().reverse()
      setComments(list)
      setNextCursor(json.nextCursor ?? null)

      // 打開時直接滑到最新
      setTimeout(() => {
        const el = scrollRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 0)
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : '取得留言失敗')
    } finally {
      setLoading(false)
    }
  }

  const fetchMore = async () => {
    if (!session?.user?.id) return
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(
        `/api/lesson-comments?lessonId=${encodeURIComponent(
          lessonId
        )}&limit=50&cursor=${encodeURIComponent(nextCursor)}`,
        { method: 'GET' }
      )
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || '取得更多留言失敗')
      }
      const more = (json.comments as LessonCommentDTO[]).slice().reverse()
      setComments((prev) => [...more, ...prev])
      setNextCursor(json.nextCursor ?? null)
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : '取得更多留言失敗')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (!open) return
    if (!session?.user?.id) return
    fetchLatest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lessonId, session?.user?.id])

  const handleSend = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const res = await fetch('/api/lesson-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          content,
          isAnonymous,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json?.success) {
        if (res.status === 429) {
          const retryAfterSec = Number(json?.retryAfterSec ?? 15)
          setCooldownUntil(Date.now() + retryAfterSec * 1000)
          toast.error('每 15 秒只能發言一次')
          return
        }
        throw new Error(json?.error || '送出失敗')
      }

      setContent('')
      setCooldownUntil(Date.now() + 15_000)

      // 重新抓最新，避免分頁/排序錯亂
      await fetchLatest()
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : '送出失敗')
    } finally {
      setSending(false)
    }
  }

  const cooldownText = useMemo(() => {
    if (!cooldownUntil) return null
    const left = Math.ceil((cooldownUntil - now) / 1000)
    if (left <= 0) return null
    return `${left}s`
  }, [cooldownUntil, now])

  useEffect(() => {
    if (!cooldownUntil) return
    const t = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [cooldownUntil])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          'p-0 border-white/10 bg-[#121212] text-white',
          isMobile ? 'h-[72vh] rounded-t-[28px]' : 'w-[420px] sm:max-w-[420px]'
        )}
      >
        {isMobile && (
          <div className="mx-auto my-4 h-1.5 w-12 rounded-full bg-white/20" />
        )}

        <SheetHeader className={cn('px-6', isMobile ? 'pb-2' : 'pt-6 pb-2')}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <SheetTitle className="text-white text-lg font-bold flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-[#C41E3A]" />
                評論
              </SheetTitle>
              <p className="mt-1 text-xs text-white/40 truncate">
                {chapterTitle} · {lessonTitle}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLatest}
              disabled={loading}
              className="h-9 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
            >
              <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
              <span className="ml-2 hidden sm:inline">更新</span>
            </Button>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="px-6 pb-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <ShieldOff className="h-4 w-4 text-white/40" />
                <span className="text-white/70">匿名送出</span>
              </div>
              <Switch
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
                className="data-[state=checked]:bg-[#C41E3A] data-[state=unchecked]:bg-white/15"
              />
            </div>
          </div>

          <div className="px-6 pb-2">
            <Button
              variant="ghost"
              onClick={fetchMore}
              disabled={!nextCursor || loadingMore}
              className={cn(
                'h-9 w-full rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
                !nextCursor && 'opacity-40'
              )}
            >
              {loadingMore ? '載入中...' : nextCursor ? '載入較早留言' : '沒有更早留言'}
            </Button>
          </div>

          <ScrollArea className="flex-1 px-6 pb-4" viewportRef={scrollRef}>
            <div className="space-y-4 py-2">
              {comments.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-sm text-white/40">還沒有留言，來當第一個吧</p>
                </div>
              )}

              {comments.map((c) => {
                const isMine = session?.user?.id === c.user.id
                return (
                  <div
                    key={c.id}
                    className={cn(
                      'flex gap-3',
                      isMine ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!isMine && (
                      <Avatar className="mt-0.5 size-8 border border-white/10 bg-white/5">
                        {c.user.image ? (
                          <AvatarImage src={c.user.image} alt={c.user.name ?? ''} />
                        ) : (
                          <AvatarFallback className="bg-transparent text-white/60">
                            <UserRound className="h-4 w-4" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                    )}

                    <div className={cn('max-w-[78%]', isMine && 'text-right')}>
                      <div className={cn('mb-1 flex items-center gap-2', isMine && 'justify-end')}>
                        <span className="text-xs font-semibold text-white/70">
                          {c.user.name ?? '學員'}
                        </span>
                        <span className="text-[11px] text-white/35">
                          {formatTime(c.createdAt)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words',
                          isMine
                            ? 'bg-[#C41E3A] text-[#0A0A0A] rounded-tr-md'
                            : 'bg-white/10 text-white rounded-tl-md'
                        )}
                      >
                        {c.content}
                      </div>
                    </div>

                    {isMine && (
                      <Avatar className="mt-0.5 size-8 border border-white/10 bg-white/5">
                        {session?.user?.image ? (
                          <AvatarImage
                            src={session.user.image}
                            alt={session.user.name ?? ''}
                          />
                        ) : (
                          <AvatarFallback className="bg-transparent text-white/60">
                            <UserRound className="h-4 w-4" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          <div className="border-t border-white/10 bg-[#0F0F0F] px-6 py-4">
            {!session?.user?.id ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                請先登入才能留言
              </div>
            ) : (
              <div className="flex gap-3">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="輸入留言..."
                  className={cn(
                    'min-h-[44px] max-h-32 resize-none rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/35 focus-visible:ring-[#C41E3A]/30',
                    cooldownText && 'opacity-80'
                  )}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  disabled={sending}
                />
                <Button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={cn(
                    'h-[44px] w-[44px] rounded-2xl bg-[#C41E3A] text-[#0A0A0A] hover:bg-[#C41E3A]/90',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  aria-label="送出留言"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between text-[11px] text-white/35">
              <span>Ctrl/⌘ + Enter 送出</span>
              <span>
                {cooldownText ? `冷卻中 ${cooldownText}` : `${content.trim().length}/2000`}
              </span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
