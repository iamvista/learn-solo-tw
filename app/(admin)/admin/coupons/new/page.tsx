// app/(admin)/admin/coupons/new/page.tsx
// 新增優惠券頁面

import { getCoursesForCoupon } from '@/lib/actions/coupons'
import { CouponForm } from '@/components/admin/coupons/coupon-form'

export const metadata = {
  title: '新增優惠券 | 後台管理',
}

interface NewCouponPageProps {
  searchParams: Promise<{
    courseId?: string
  }>
}

export default async function NewCouponPage({ searchParams }: NewCouponPageProps) {
  const { courseId } = await searchParams
  const courses = await getCoursesForCoupon()

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-bold text-foreground">新增優惠券</h1>
      <CouponForm courses={courses} defaultCourseIds={courseId ? [courseId] : undefined} />
    </div>
  )
}
