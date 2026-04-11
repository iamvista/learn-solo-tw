// components/main/landing/pages/types.ts
// 銷售頁元件共用型別

import type { CourseDetail, PurchaseStatus } from '@/lib/actions/public-courses'
import type { ReviewStats, ReviewData, UserReview } from '@/lib/validations/review'

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
  // 評價系統
  reviewStats?: ReviewStats
  initialReviews?: ReviewData[]
  initialHasMore?: boolean
  userReview?: UserReview | null
  currentUserId?: string | null
}
