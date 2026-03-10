// components/admin/orders/refund-dialog.tsx
// 退款對話框元件
// 用於標記訂單為已退款

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RotateCcw, AlertTriangle } from 'lucide-react'
import { markAsRefunded } from '@/lib/actions/orders'
import { refundSchema, type RefundData } from '@/lib/validations/order'
import { toast } from 'sonner'

interface RefundDialogProps {
  orderId: string
  orderNo: string
  amount: number
}

export function RefundDialog({ orderId, orderNo, amount }: RefundDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const form = useForm<RefundData>({
    resolver: zodResolver(refundSchema),
    defaultValues: {
      orderId,
      reason: '',
    },
  })

  const onSubmit = async (data: RefundData) => {
    try {
      setIsSubmitting(true)

      const result = await markAsRefunded(data)

      if (!result.success) {
        throw new Error(result.error || '退款失敗')
      }

      toast.success('退款標記成功')
      setOpen(false)
      form.reset()
      router.refresh()
    } catch (error) {
      console.error('退款失敗:', error)
      toast.error(error instanceof Error ? error.message : '退款失敗，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 格式化金額
  const formatAmount = (amount: number): string => {
    return `NT$ ${amount.toLocaleString()}`
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEE2E2] hover:text-[#991B1B] rounded-lg"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          標記退款
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-[#E5E5E5] sm:max-w-[425px] rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-[#0A0A0A] flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#F5A524]" />
            確認退款
          </DialogTitle>
          <DialogDescription className="text-[#525252]">
            此操作將標記訂單為已退款狀態，並撤銷學員的課程存取權限。
          </DialogDescription>
        </DialogHeader>

        <div className="bg-[#FAFAFA] rounded-xl p-4 my-4 border border-[#E5E5E5]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[#525252] text-sm">訂單編號</span>
            <span className="text-[#0A0A0A] font-mono text-sm">{orderNo}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#525252] text-sm">退款金額</span>
            <span className="text-[#DC2626] font-bold">{formatAmount(amount)}</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#0A0A0A]">
                    退款原因 <span className="text-[#DC2626]">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="請輸入退款原因..."
                      className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] min-h-[100px] rounded-lg focus:border-[#F5A524] focus:ring-[#F5A524]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[#DC2626]" />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg"
              >
                {isSubmitting ? '處理中...' : '確認退款'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
