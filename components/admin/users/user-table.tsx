// components/admin/users/user-table.tsx
// 用戶表格元件
// 顯示學員列表，支援多選和批次操作

'use client'

import { useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, Users, X } from 'lucide-react'
import { BatchGrantAccessDialog } from './batch-grant-access-dialog'

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const allSelected = users.length > 0 && selectedIds.size === users.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < users.length

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

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

  const selectedUsers = users.filter((u) => selectedIds.has(u.id))

  return (
    <>
      {/* 批次操作列 */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#C41E3A]/20 bg-[#C41E3A]/5 px-4 py-3">
          <span className="text-sm font-medium text-[#0A0A0A]">
            已選取 {selectedIds.size} 位學員
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <BatchGrantAccessDialog
              selectedUsers={selectedUsers.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
              }))}
              onComplete={() => setSelectedIds(new Set())}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-[#525252] hover:text-[#0A0A0A] hover:bg-white/50"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              取消選取
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[#E5E5E5] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[#E5E5E5] hover:bg-transparent bg-[#FAFAFA]">
              <TableHead className="w-10 pl-4">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                  aria-label="全選"
                />
              </TableHead>
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
                className={`border-[#E5E5E5] hover:bg-[#FAFAFA] ${selectedIds.has(user.id) ? 'bg-[#C41E3A]/5' : ''}`}
              >
                {/* 選取 */}
                <TableCell className="pl-4">
                  <Checkbox
                    checked={selectedIds.has(user.id)}
                    onCheckedChange={() => toggleOne(user.id)}
                    aria-label={`選取 ${user.name || user.email}`}
                  />
                </TableCell>

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
                        ? 'bg-[#C41E3A] hover:bg-[#A01830] text-white'
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
    </>
  )
}
