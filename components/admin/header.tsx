// components/admin/header.tsx
// 後台頂部導覽列元件
// 包含用戶資訊和登出功能

'use client'

import { signOut } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, Bell } from 'lucide-react'
import { MobileNav } from './mobile-nav'

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string
  }
}

export function Header({ user }: HeaderProps) {
  // 取得用戶名稱的首字母作為頭像備用顯示
  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? user.email?.[0]?.toUpperCase() ?? 'U'

  // 取得角色顯示文字
  const roleText = user.role === 'ADMIN' ? '管理員' : '編輯者'

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      {/* 左側：行動版選單按鈕 */}
      <div className="flex items-center gap-4">
        <MobileNav userRole={user.role} />
        <h1 className="text-lg font-semibold text-foreground hidden lg:block">
          後台管理系統
        </h1>
      </div>

      {/* 右側：通知和用戶選單 */}
      <div className="flex items-center gap-3">
        {/* 用戶下拉選單 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? ''} />
                <AvatarFallback className="bg-secondary text-muted-foreground border border-border">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 bg-card border-border rounded-xl"
            align="end"
            forceMount
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {user.name ?? '用戶'}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <p className="text-xs text-primary">{roleText}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              className="text-muted-foreground focus:bg-secondary focus:text-foreground cursor-pointer rounded-lg"
            >
              <User className="mr-2 h-4 w-4" />
              <span>個人資料</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-destructive focus:bg-secondary focus:text-destructive cursor-pointer rounded-lg"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>登出</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
