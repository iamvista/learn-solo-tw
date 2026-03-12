// components/admin/users/admin-table.tsx
// 管理員表格元件
// 顯示管理員和編輯者列表，支援角色切換

'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { updateUserRole, type AdminUser } from '@/lib/actions/users'
import type { UserRole } from '@prisma/client'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Shield, Loader2 } from 'lucide-react'

interface AdminTableProps {
  admins: AdminUser[]
  currentUserId: string
}

// 角色顯示設定
const roleConfig: Record<UserRole, { label: string; className: string }> = {
  USER: {
    label: '學員',
    className: 'bg-[#FAFAFA] hover:bg-[#FAFAFA] text-[#525252] border border-[#E5E5E5]',
  },
  EDITOR: {
    label: '編輯者',
    className: 'bg-[#C41E3A] hover:bg-[#A01830] text-white',
  },
  ADMIN: {
    label: '管理員',
    className: 'bg-[#0A0A0A] hover:bg-[#0A0A0A] text-white',
  },
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

export function AdminTable({ admins, currentUserId }: AdminTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false)
  const [userToChange, setUserToChange] = useState<AdminUser | null>(null)
  const [newRole, setNewRole] = useState<UserRole | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  // 處理角色變更點擊
  function handleRoleChange(admin: AdminUser, role: UserRole) {
    if (admin.id === currentUserId) {
      toast.error('無法修改自己的角色')
      return
    }

    if (admin.role === role) return

    setUserToChange(admin)
    setNewRole(role)
    setChangeRoleDialogOpen(true)
  }

  // 確認變更角色
  async function handleConfirmRoleChange() {
    if (!userToChange || !newRole) return

    setActioningId(userToChange.id)
    startTransition(async () => {
      try {
        const result = await updateUserRole({
          userId: userToChange.id,
          role: newRole,
        })

        if (result.success) {
          const roleLabel = roleConfig[newRole].label
          toast.success(`用戶角色已更新為「${roleLabel}」`)
          setChangeRoleDialogOpen(false)
          setUserToChange(null)
          setNewRole(null)
          router.refresh()
        } else {
          toast.error(result.error ?? '更新角色失敗')
        }
      } catch {
        toast.error('更新角色時發生錯誤')
      } finally {
        setActioningId(null)
      }
    })
  }

  if (admins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-[#A3A3A3]" />
        </div>
        <h3 className="text-lg font-medium text-[#0A0A0A] mb-2">
          尚未有管理員
        </h3>
        <p className="text-sm text-[#525252] mb-4">
          目前沒有管理員或編輯者帳號
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-[#E5E5E5] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[#E5E5E5] hover:bg-transparent bg-[#FAFAFA]">
              <TableHead className="text-[#525252] w-12">頭像</TableHead>
              <TableHead className="text-[#525252]">姓名</TableHead>
              <TableHead className="text-[#525252]">Email</TableHead>
              <TableHead className="text-[#525252] w-40">角色</TableHead>
              <TableHead className="text-[#525252] w-32">建立日期</TableHead>
              <TableHead className="text-[#525252] w-24 text-center">
                操作記錄
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => {
              const role = roleConfig[admin.role]
              const isActioning = actioningId === admin.id
              const isCurrentUser = admin.id === currentUserId

              return (
                <TableRow
                  key={admin.id}
                  className="border-[#E5E5E5] hover:bg-[#FAFAFA]"
                >
                  {/* 頭像 */}
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={admin.image ?? undefined} alt={admin.name ?? '用戶'} />
                      <AvatarFallback className="bg-[#FAFAFA] text-[#525252] border border-[#E5E5E5]">
                        {getInitials(admin.name)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>

                  {/* 姓名 */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#0A0A0A]">
                        {admin.name || '未設定姓名'}
                      </p>
                      {isCurrentUser && (
                        <Badge
                          variant="outline"
                          className="border-[#E5E5E5] text-[#525252]"
                        >
                          你自己
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Email */}
                  <TableCell>
                    <p className="text-[#525252] text-sm">{admin.email}</p>
                  </TableCell>

                  {/* 角色選擇 */}
                  <TableCell>
                    {isCurrentUser ? (
                      <Badge className={role.className}>{role.label}</Badge>
                    ) : (
                      <Select
                        value={admin.role}
                        onValueChange={(value) =>
                          handleRoleChange(admin, value as UserRole)
                        }
                        disabled={isActioning}
                      >
                        <SelectTrigger className="w-32 h-8 bg-white border-[#E5E5E5] text-[#0A0A0A] rounded-lg">
                          {isActioning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent className="bg-white border-[#E5E5E5]">
                          <SelectItem
                            value="ADMIN"
                            className="text-[#0A0A0A] focus:bg-[#FAFAFA] focus:text-[#0A0A0A]"
                          >
                            管理員
                          </SelectItem>
                          <SelectItem
                            value="EDITOR"
                            className="text-[#C41E3A] focus:bg-[#FAFAFA] focus:text-[#A01830]"
                          >
                            編輯者
                          </SelectItem>
                          <SelectItem
                            value="USER"
                            className="text-[#525252] focus:bg-[#FAFAFA] focus:text-[#525252]"
                          >
                            學員
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>

                  {/* 建立日期 */}
                  <TableCell>
                    <p className="text-[#525252] text-sm">
                      {format(new Date(admin.createdAt), 'yyyy/MM/dd', {
                        locale: zhTW,
                      })}
                    </p>
                  </TableCell>

                  {/* 操作記錄 */}
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className="border-[#E5E5E5] text-[#525252]"
                    >
                      {admin._count.adminLogs} 筆
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* 變更角色確認對話框 */}
      <Dialog open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#0A0A0A]">確認變更角色</DialogTitle>
            <DialogDescription className="text-[#525252]">
              {newRole === 'USER' ? (
                <>
                  您確定要將「{userToChange?.name || userToChange?.email}」的角色從
                  「{userToChange && roleConfig[userToChange.role].label}」降級為「學員」嗎？
                  <br />
                  <span className="text-[#A01830] font-medium">
                    此操作將移除該用戶的管理權限。
                  </span>
                </>
              ) : (
                <>
                  您確定要將「{userToChange?.name || userToChange?.email}」的角色變更為
                  「{newRole && roleConfig[newRole].label}」嗎？
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangeRoleDialogOpen(false)}
              className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
            >
              取消
            </Button>
            <Button
              variant={newRole === 'USER' ? 'destructive' : 'default'}
              onClick={handleConfirmRoleChange}
              disabled={isPending}
              className={
                newRole === 'USER'
                  ? 'bg-red-500 hover:bg-red-600 rounded-lg'
                  : 'bg-[#C41E3A] hover:bg-[#A01830] rounded-lg'
              }
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  變更中...
                </>
              ) : (
                '確認變更'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
