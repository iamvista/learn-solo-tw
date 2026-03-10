// components/admin/users/user-purchases.tsx
// 用戶購買記錄列表
// 顯示用戶已購買的課程及撤銷功能

'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { revokeCourseAccess } from '@/lib/actions/users'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BookOpen, Loader2, ShieldX } from 'lucide-react'
import type { Purchase, Course } from '@prisma/client'

interface UserPurchasesProps {
  userId: string
  purchases: (Purchase & {
    course: Course
  })[]
}

export function UserPurchases({ userId, purchases }: UserPurchasesProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [purchaseToRevoke, setPurchaseToRevoke] = useState<(Purchase & { course: Course }) | null>(null)

  // 處理撤銷點擊
  function handleRevokeClick(purchase: Purchase & { course: Course }) {
    setPurchaseToRevoke(purchase)
    setRevokeDialogOpen(true)
  }

  // 確認撤銷
  async function handleConfirmRevoke() {
    if (!purchaseToRevoke) return

    startTransition(async () => {
      try {
        const result = await revokeCourseAccess({
          userId,
          courseId: purchaseToRevoke.courseId,
        })

        if (result.success) {
          toast.success('課程存取權限已撤銷')
          setRevokeDialogOpen(false)
          setPurchaseToRevoke(null)
          router.refresh()
        } else {
          toast.error(result.error ?? '撤銷權限失敗')
        }
      } catch {
        toast.error('撤銷權限時發生錯誤')
      }
    })
  }

  return (
    <>
      <Card className="bg-white border-[#E5E5E5] rounded-xl">
        <CardHeader>
          <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            已購課程
            <Badge
              variant="secondary"
              className="bg-[#FAFAFA] text-[#525252] border border-[#E5E5E5] ml-2"
            >
              {purchases.length} 門
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center mb-3">
                <BookOpen className="h-6 w-6 text-[#A3A3A3]" />
              </div>
              <p className="text-[#525252] text-sm">
                此用戶尚未購買任何課程
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E5E5E5] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#E5E5E5] hover:bg-transparent bg-[#FAFAFA]">
                    <TableHead className="text-[#525252]">課程名稱</TableHead>
                    <TableHead className="text-[#525252] w-32">取得方式</TableHead>
                    <TableHead className="text-[#525252] w-32">取得日期</TableHead>
                    <TableHead className="text-[#525252] w-32">有效期限</TableHead>
                    <TableHead className="text-[#525252] w-20 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow
                      key={purchase.id}
                      className="border-[#E5E5E5] hover:bg-[#FAFAFA]"
                    >
                      {/* 課程名稱 */}
                      <TableCell>
                        <p className="font-medium text-[#0A0A0A]">
                          {purchase.course.title}
                        </p>
                      </TableCell>

                      {/* 取得方式 */}
                      <TableCell>
                        <Badge
                          variant={purchase.orderId ? 'default' : 'secondary'}
                          className={
                            purchase.orderId
                              ? 'bg-[#F5A524] hover:bg-[#E09000] text-white'
                              : 'bg-[#FAFAFA] hover:bg-[#FAFAFA] text-[#525252] border border-[#E5E5E5]'
                          }
                        >
                          {purchase.orderId ? '購買' : '手動授權'}
                        </Badge>
                      </TableCell>

                      {/* 取得日期 */}
                      <TableCell>
                        <p className="text-[#525252] text-sm">
                          {format(new Date(purchase.createdAt), 'yyyy/MM/dd', {
                            locale: zhTW,
                          })}
                        </p>
                      </TableCell>

                      {/* 有效期限 */}
                      <TableCell>
                        {purchase.expiresAt ? (
                          <p className="text-[#525252] text-sm">
                            {format(new Date(purchase.expiresAt), 'yyyy/MM/dd', {
                              locale: zhTW,
                            })}
                          </p>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-[#E5E5E5] text-[#525252]"
                          >
                            永久
                          </Badge>
                        )}
                      </TableCell>

                      {/* 操作 */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeClick(purchase)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <ShieldX className="h-4 w-4" />
                          <span className="sr-only">撤銷權限</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 撤銷確認對話框 */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#0A0A0A]">確認撤銷權限</DialogTitle>
            <DialogDescription className="text-[#525252]">
              您確定要撤銷此用戶對「{purchaseToRevoke?.course.title}」的存取權限嗎？
              撤銷後用戶將無法繼續觀看此課程。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeDialogOpen(false)}
              className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRevoke}
              disabled={isPending}
              className="bg-red-500 hover:bg-red-600 rounded-lg"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  撤銷中...
                </>
              ) : (
                '確認撤銷'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
