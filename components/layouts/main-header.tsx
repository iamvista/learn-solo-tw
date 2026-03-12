// components/layouts/main-header.tsx
// 前臺網站 Header 元件
// 極簡黑白灰設計 + #C41E3A 強調色
// 符合 Solo Academy Design System

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Menu, X, LogOut, User, BookOpen, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { NavLink } from '@/lib/site-settings-public-types'

interface MainHeaderProps {
  siteName: string
  headerLeftLinks: NavLink[]
  headerRightLinks: NavLink[]
}

export function MainHeader({ siteName, headerLeftLinks, headerRightLinks }: MainHeaderProps) {
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const { scrollY } = useScroll()
  const pathname = usePathname()
  const isLessonPage = pathname?.includes('/lessons/')

  // 監聽捲動事件來決定 Header 是否顯示
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0
    // 向下捲動且超過一定距離就隱藏，向上捲動或在頂部就顯示
    if (latest > previous && latest > 100) {
      setIsVisible(false)
    } else {
      setIsVisible(true)
    }
  })

  const isLoading = status === 'loading'
  const isLoggedIn = !!session?.user

  // 禁止捲動當手機選單開啟時
  // eslint-disable-next-line react-compiler/react-compiler
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
      // 手機選單開啟時強迫 Header 顯示
      setIsVisible(true)
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const getInitials = (name?: string | null) => {
    if (!name) return 'U'
    return name.charAt(0).toUpperCase()
  }

  return (
    <motion.header
      variants={{
        visible: { y: 0 },
        hidden: { y: '-100%' },
      }}
      animate={isVisible ? 'visible' : 'hidden'}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        "z-[100] w-full border-b border-[#E5E5E5] bg-white/80 backdrop-blur-md transition-all",
        // 在課程頁面，手機版不使用 Sticky 以免擋住影片
        isLessonPage ? "relative md:sticky md:top-0" : "sticky top-0"
      )}
    >
      <div className={cn(
        "mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8",
        isLessonPage ? "h-16 md:h-20" : "h-20"
      )}>
        <div className="flex items-center gap-8">
          {/* 左側：Logo */}
          <Logo size="md" />
          {headerLeftLinks.map((link, i) => (
            <a
              key={i}
              href={link.url}
              {...(link.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="hidden text-md font-medium text-[#525252] transition-colors hover:text-[#0A0A0A] md:block"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* 右側：導航連結 + 用戶區塊 */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* 電腦版主導航項目 (移動到右側) */}
          {headerRightLinks.map((link, i) =>
            link.openInNewTab ? (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden text-sm font-medium text-[#525252] transition-colors hover:text-[#0A0A0A] md:block"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={i}
                href={link.url}
                className="hidden text-sm font-medium text-[#525252] transition-colors hover:text-[#0A0A0A] md:block"
              >
                {link.label}
              </Link>
            )
          )}

          <div className="hidden items-center gap-6 md:flex">
            {isLoading ? (
              <div className="h-9 w-20 animate-pulse rounded-full bg-[#F5F5F5]" />
            ) : isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="group relative h-10 w-10 flex-shrink-0 rounded-full p-0 overflow-hidden border border-transparent transition-all hover:border-[#E5E5E5]"
                  >
                    <Avatar className="h-full w-full transition-transform duration-300 group-hover:scale-110">
                      <AvatarImage
                        src={session.user.image || undefined}
                        alt={session.user.name || '用戶'}
                      />
                      <AvatarFallback className="bg-[#C41E3A] text-white">
                        {getInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-64 overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white p-2 shadow-xl shadow-[#0A0A0A]/5 animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="flex items-center gap-3 p-3">
                    <Avatar className="h-10 w-10 border border-[#E5E5E5]">
                      <AvatarImage
                        src={session.user.image || undefined}
                        alt={session.user.name || '用戶'}
                      />
                      <AvatarFallback className="bg-[#C41E3A] text-white font-semibold">
                        {getInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <p className="truncate text-sm font-bold text-[#0A0A0A]">
                        {session.user.name}
                      </p>
                      <p className="truncate text-xs text-[#A3A3A3]">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator className="mx-2 bg-[#F5F5F5]" />
                  
                  <div className="py-1">
                    <DropdownMenuItem asChild>
                      <Link
                        href="/my-courses"
                        className="flex cursor-pointer items-center rounded-xl px-3 py-2.5 text-sm font-medium text-[#525252] outline-none transition-colors hover:bg-[#FAFAFA] hover:text-[#0A0A0A] focus:bg-[#FAFAFA]"
                      >
                        <User className="mr-3 h-4 w-4 text-[#A3A3A3]" />
                        我的學習中心
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="flex cursor-pointer items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 outline-none transition-colors hover:bg-red-50/50 focus:bg-red-50/50"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      登出帳號
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                className="rounded-full bg-[#0A0A0A] px-6 text-sm font-semibold text-white transition-all hover:bg-[#262626] hover:scale-[1.02] active:scale-[0.98]"
              >
                <Link href="/login">開始學習</Link>
              </Button>
            )}
          </div>

          {/* 手機版漢堡選單按鈕 */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5] transition-colors hover:bg-[#E5E5E5] md:hidden"
            aria-expanded={isMobileMenuOpen}
          >
            <AnimatePresence mode="wait">
              {isMobileMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="h-5 w-5 text-[#0A0A0A]" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="h-5 w-5 text-[#0A0A0A]" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* 手機版全螢幕選單 - 使用 Portal 確保層級正確 */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-200 bg-black/20 backdrop-blur-sm md:hidden"
            />

            {/* 選單面板 */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-210 flex h-dvh w-[85%] max-w-sm flex-col border-l border-[#E5E5E5] bg-white shadow-2xl md:hidden"
            >
              {/* 選單 Header */}
              <div className="flex h-20 items-center justify-between px-6 border-b border-[#F5F5F5]">
                <Logo size="sm" />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5] transition-colors hover:bg-[#E5E5E5]"
                >
                  <X className="h-5 w-5 text-[#0A0A0A]" />
                </button>
              </div>

              {/* 選單內容 */}
              <div className="flex-1 overflow-y-auto px-6 py-8">
                {headerRightLinks.length > 0 && (
                  <nav className="flex flex-col gap-2">
                    <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#A3A3A3]">
                      導航
                    </p>
                    {headerRightLinks.map((link, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                      >
                        {link.openInNewTab ? (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="group flex items-center justify-between rounded-2xl bg-[#FAFAFA] p-4 text-lg font-bold text-[#0A0A0A] transition-all hover:bg-[#C41E3A] hover:text-white"
                          >
                            <div className="flex items-center gap-3">
                              <BookOpen className="h-5 w-5 opacity-50 transition-opacity group-hover:opacity-100" />
                              {link.label}
                            </div>
                            <ChevronRight className="h-5 w-5 opacity-30 transition-opacity group-hover:opacity-100" />
                          </a>
                        ) : (
                          <Link
                            href={link.url}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="group flex items-center justify-between rounded-2xl bg-[#FAFAFA] p-4 text-lg font-bold text-[#0A0A0A] transition-all hover:bg-[#C41E3A] hover:text-white"
                          >
                            <div className="flex items-center gap-3">
                              <BookOpen className="h-5 w-5 opacity-50 transition-opacity group-hover:opacity-100" />
                              {link.label}
                            </div>
                            <ChevronRight className="h-5 w-5 opacity-30 transition-opacity group-hover:opacity-100" />
                          </Link>
                        )}
                      </motion.div>
                    ))}
                  </nav>
                )}

                {/* 左側連結（社群等） */}
                {headerLeftLinks.length > 0 && (
                  <div className="mt-8 border-t border-[#F5F5F5] pt-8">
                    <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#A3A3A3]">
                      連結
                    </p>
                    <div className="flex flex-col gap-2">
                      {headerLeftLinks.map((link, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + i * 0.05 }}
                        >
                          <a
                            href={link.url}
                            {...(link.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="group flex items-center justify-between rounded-2xl bg-[#FAFAFA] p-4 text-base font-semibold text-[#525252] transition-all hover:bg-[#C41E3A] hover:text-white"
                          >
                            {link.label}
                            <ChevronRight className="h-5 w-5 opacity-30 transition-opacity group-hover:opacity-100" />
                          </a>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 用戶區塊 */}
                <div className="mt-12 border-t border-[#F5F5F5] pt-12">
                  {isLoggedIn ? (
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 border-2 border-[#E5E5E5]">
                          <AvatarImage
                            src={session?.user?.image || undefined}
                            alt={session?.user?.name || '用戶'}
                          />
                          <AvatarFallback className="bg-[#C41E3A] text-white text-xl">
                            {getInitials(session?.user?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-[#0A0A0A]">
                            {session?.user?.name}
                          </span>
                          <span className="text-sm text-[#525252]">
                            {session?.user?.email}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <Button
                          asChild
                          variant="outline"
                          className="h-14 w-full justify-start rounded-2xl border-[#E5E5E5] px-6 text-base font-bold text-[#0A0A0A] hover:bg-[#FAFAFA]"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Link href="/my-courses">
                            <User className="mr-3 h-5 w-5 text-[#A3A3A3]" />
                            我的學習中心
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setIsMobileMenuOpen(false)
                            signOut({ callbackUrl: '/' })
                          }}
                          className="h-14 w-full justify-start rounded-2xl px-6 text-base font-bold text-red-500 hover:bg-red-50"
                        >
                          <LogOut className="mr-3 h-5 w-5" />
                          登出帳號
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <p className="text-center text-sm text-[#525252]">
                        加入超過 500+ 名學習者的行列
                      </p>
                      <Button
                        asChild
                        size="lg"
                        className="h-16 w-full rounded-full bg-[#C41E3A] text-lg font-bold text-white shadow-xl shadow-[#C41E3A]/20 hover:bg-[#A01830]"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Link href="/login">立即加入學習</Link>
                      </Button>
                      <Link
                        href="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-center text-sm font-medium text-[#A3A3A3] hover:text-[#0A0A0A]"
                      >
                        已經有帳號了？點擊登入
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 選單 Footer */}
              <div className="p-6 text-center text-xs text-[#A3A3A3]">
                © {new Date().getFullYear()} {siteName}. All rights reserved.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
