// components/admin/users/grant-access-dialog.tsx
// 授權課程對話框
// 提供手動授權課程給用戶的功能

'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { grantCourseAccess, getAvailableCourses } from '@/lib/actions/users'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Plus, Loader2 } from 'lucide-react'

interface GrantAccessDialogProps {
  userId: string
  userName: string | null
  existingCourseIds: string[]
}

export function GrantAccessDialog({
  userId,
  userName,
  existingCourseIds,
}: GrantAccessDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [expiresAt, setExpiresAt] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  // 載入可授權的課程
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      getAvailableCourses()
        .then((data) => {
          // 排除用戶已擁有的課程
          const availableCourses = data.filter(
            (course) => !existingCourseIds.includes(course.id)
          )
          setCourses(availableCourses)
        })
        .catch(() => {
          toast.error('載入課程列表失敗')
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [isOpen, existingCourseIds])

  // 處理授權
  async function handleGrant() {
    if (!selectedCourseId) {
      toast.error('請選擇課程')
      return
    }

    startTransition(async () => {
      try {
        const result = await grantCourseAccess({
          userId,
          courseId: selectedCourseId,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        })

        if (result.success) {
          toast.success('課程授權成功')
          setIsOpen(false)
          setSelectedCourseId('')
          setExpiresAt('')
          router.refresh()
        } else {
          toast.error(result.error ?? '授權失敗')
        }
      } catch {
        toast.error('授權課程時發生錯誤')
      }
    })
  }

  // 重置表單
  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (!open) {
      setSelectedCourseId('')
      setExpiresAt('')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-[#F5A524] hover:bg-[#E09000] text-white rounded-lg">
          <Plus className="mr-2 h-4 w-4" />
          手動授權課程
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-[#E5E5E5] rounded-xl sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-[#0A0A0A]">授權課程</DialogTitle>
          <DialogDescription className="text-[#525252]">
            為 {userName || '此用戶'} 手動授權課程存取權限
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* 課程選擇 */}
          <div className="grid gap-2">
            <Label htmlFor="course" className="text-[#0A0A0A]">
              選擇課程
            </Label>
            {isLoading ? (
              <div className="flex items-center justify-center h-9 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-[#A3A3A3]" />
              </div>
            ) : courses.length === 0 ? (
              <div className="text-sm text-[#525252] p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-center">
                沒有可授權的課程（用戶已擁有所有課程）
              </div>
            ) : (
              <Select
                value={selectedCourseId}
                onValueChange={setSelectedCourseId}
              >
                <SelectTrigger className="bg-white border-[#E5E5E5] text-[#0A0A0A] rounded-lg">
                  <SelectValue placeholder="選擇要授權的課程" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E5E5E5]">
                  {courses.map((course) => (
                    <SelectItem
                      key={course.id}
                      value={course.id}
                      className="text-[#525252] focus:bg-[#FAFAFA] focus:text-[#0A0A0A]"
                    >
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 有效期限 */}
          <div className="grid gap-2">
            <Label htmlFor="expiresAt" className="text-[#0A0A0A]">
              有效期限（選填）
            </Label>
            <Input
              id="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="bg-white border-[#E5E5E5] text-[#0A0A0A] rounded-lg"
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-[#A3A3A3]">
              留空表示永久有效
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
          >
            取消
          </Button>
          <Button
            onClick={handleGrant}
            disabled={isPending || !selectedCourseId || courses.length === 0}
            className="bg-[#F5A524] hover:bg-[#E09000] text-white rounded-lg"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                授權中...
              </>
            ) : (
              '確認授權'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
