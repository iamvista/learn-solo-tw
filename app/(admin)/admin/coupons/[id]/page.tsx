// app/(admin)/admin/coupons/[id]/page.tsx
// 編輯優惠券頁面

import { notFound } from 'next/navigation'
import { getCouponById, getCoursesForCoupon } from '@/lib/actions/coupons'
import { CouponForm } from '@/components/admin/coupons/coupon-form'

export const metadata = {
  title: '編輯優惠券 | 後台管理',
}

interface EditCouponPageProps {
  params: Promise<{ id: string }>
}

export default async function EditCouponPage({ params }: EditCouponPageProps) {
  const { id } = await params
  const [coupon, courses] = await Promise.all([
    getCouponById(id),
    getCoursesForCoupon(),
  ])

  if (!coupon) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">編輯優惠券</h1>
      <CouponForm coupon={coupon} courses={courses} />
    </div>
  )
}
