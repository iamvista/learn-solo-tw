// components/admin/users/promote-role-dialog.tsx
// 提升用戶角色對話框
// 允許管理員在學員詳情頁將學員提升為管理員或編輯者

'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { updateUserRole } from '@/lib/actions/users'
import type { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, Loader2 } from 'lucide-react'

interface PromoteRoleDialogProps {
  userId: string
  userName: string | null
  currentRole: UserRole
}

const roleLabels: Record<UserRole, string> = {
  USER: '學員',
  EDITOR: '編輯者',
  ADMIN: '管理員',
}

export function PromoteRoleDialog({
  userId,
  userName,
  currentRole,
}: PromoteRoleDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    currentRole === 'USER' ? 'EDITOR' : currentRole
  )

  const handleConfirm = () => {
    if (selectedRole === currentRole) {
      toast.error('角色未變更')
      return
    }

    startTransition(async () => {
      try {
        const result = await updateUserRole({
          userId,
          role: selectedRole,
        })

        if (result.success) {
          toast.success(`已將用戶角色變更為「${roleLabels[selectedRole]}」`)
          setOpen(false)
          router.refresh()
        } else {
          toast.error(result.error ?? '變更角色失敗')
        }
      } catch {
        toast.error('變更角色時發生錯誤')
      }
    })
  }

  const displayName = userName || '此用戶'
  const isDemoting =
    (currentRole === 'ADMIN' && selectedRole !== 'ADMIN') ||
    (currentRole === 'EDITOR' && selectedRole === 'USER')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
        >
          <Shield className="mr-2 h-4 w-4" />
          變更角色
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-[#E5E5E5] rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-[#0A0A0A]">
            變更用戶角色
          </DialogTitle>
          <DialogDescription className="text-[#525252]">
            將「{displayName}」的角色從「{roleLabels[currentRole]}」變更為其他角色。
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium text-[#0A0A0A] mb-2 block">
            選擇新角色
          </label>
          <Select
            value={selectedRole}
            onValueChange={(v) => setSelectedRole(v as UserRole)}
          >
            <SelectTrigger className="w-full bg-white border-[#E5E5E5] text-[#0A0A0A] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-[#E5E5E5]">
              <SelectItem value="ADMIN">管理員 — 完整管理權限</SelectItem>
              <SelectItem value="EDITOR">編輯者 — 內容管理權限</SelectItem>
              <SelectItem value="USER">學員 — 一般用戶</SelectItem>
            </SelectContent>
          </Select>

          {isDemoting && (
            <p className="text-sm text-amber-700 mt-3">
              此操作將降低該用戶的權限等級。
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || selectedRole === currentRole}
            className={
              isDemoting
                ? 'bg-red-500 hover:bg-red-600 rounded-lg'
                : 'bg-[#F5A524] hover:bg-[#E09000] rounded-lg'
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
  )
}
