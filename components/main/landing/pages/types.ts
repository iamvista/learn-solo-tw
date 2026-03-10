// components/main/landing/pages/types.ts
// 銷售頁元件共用型別

import type { CourseDetail, PurchaseStatus } from '@/lib/actions/public-courses'

export interface LandingPageProps {
  course: CourseDetail
  purchaseStatus: PurchaseStatus
  isLoggedIn: boolean
  isFree: boolean
  finalPrice: number
  originalPrice: number
  isOnSale: boolean
  saleEndAt: Date | null
  saleLabel: string
  countdownTarget: Date | null
  saleCycleEnabled: boolean
  saleCycleDays: number | null
  showCountdown: boolean
  shouldAutoEnroll: boolean
}
