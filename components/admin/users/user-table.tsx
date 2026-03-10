// components/admin/users/user-table.tsx
// 用戶表格元件
// 顯示學員列表，支援操作功能

'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import type { UserWithPurchaseCount } from '@/lib/actions/users'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Eye, Users } from 'lucide-react'

interface UserTableProps {
  users: UserWithPurchaseCount[]
}

// 取得用戶名稱縮寫
function getInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function UserTable({ users }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-[#A3A3A3]" />
        </div>
        <h3 className="text-lg font-medium text-[#0A0A0A] mb-2">
          尚未有學員
        </h3>
        <p className="text-sm text-[#525252] mb-4">
          目前沒有符合條件的學員資料
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#E5E5E5] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-[#E5E5E5] hover:bg-transparent bg-[#FAFAFA]">
            <TableHead className="text-[#525252] w-12">頭像</TableHead>
            <TableHead className="text-[#525252]">姓名</TableHead>
            <TableHead className="text-[#525252]">Email</TableHead>
            <TableHead className="text-[#525252]">電話</TableHead>
            <TableHead className="text-[#525252] w-32 text-center">
              已購課程數
            </TableHead>
            <TableHead className="text-[#525252] w-32">註冊日期</TableHead>
            <TableHead className="text-[#525252] w-20 text-right">
              操作
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              className="border-[#E5E5E5] hover:bg-[#FAFAFA]"
            >
              {/* 頭像 */}
              <TableCell>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.image ?? undefined} alt={user.name ?? '用戶'} />
                  <AvatarFallback className="bg-[#FAFAFA] text-[#525252] border border-[#E5E5E5]">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </TableCell>

              {/* 姓名 */}
              <TableCell>
                <p className="font-medium text-[#0A0A0A]">
                  {user.name || '未設定姓名'}
                </p>
              </TableCell>

              {/* Email */}
              <TableCell>
                <p className="text-[#525252] text-sm">{user.email}</p>
              </TableCell>

              {/* 電話 */}
              <TableCell>
                <p className="text-[#525252] text-sm">
                  {user.phone || '-'}
                </p>
              </TableCell>

              {/* 已購課程數 */}
              <TableCell className="text-center">
                <Badge
                  variant={user._count.purchases > 0 ? 'default' : 'secondary'}
                  className={
                    user._count.purchases > 0
                      ? 'bg-[#F5A524] hover:bg-[#E09000] text-white'
                      : 'bg-[#FAFAFA] hover:bg-[#FAFAFA] text-[#525252] border border-[#E5E5E5]'
                  }
                >
                  {user._count.purchases} 門課程
                </Badge>
              </TableCell>

              {/* 註冊日期 */}
              <TableCell>
                <p className="text-[#525252] text-sm">
                  {format(new Date(user.createdAt), 'yyyy/MM/dd', {
                    locale: zhTW,
                  })}
                </p>
              </TableCell>

              {/* 操作 */}
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8 w-8 p-0 text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]"
                >
                  <Link href={`/admin/users/${user.id}`}>
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">查看詳情</span>
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
