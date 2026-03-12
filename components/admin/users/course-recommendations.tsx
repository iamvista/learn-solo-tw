// components/admin/users/course-recommendations.tsx
// 課程推薦分析卡片
// 基於交叉購買行為的課程推薦

import Image from "next/image";
import type { CourseRecommendation } from "@/lib/actions/users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";

interface CourseRecommendationsProps {
  recommendations: CourseRecommendation[];
}

function formatPrice(price: number) {
  if (price === 0) return "免費";
  return `NT$ ${price.toLocaleString()}`;
}

function getRateBadge(rate: number) {
  if (rate >= 50) {
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">
        {rate}% 高意願
      </Badge>
    );
  }
  if (rate >= 20) {
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">
        {rate}% 中意願
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 border-0 text-xs">
      {rate}% 低意願
    </Badge>
  );
}

export function CourseRecommendations({
  recommendations,
}: CourseRecommendationsProps) {
  return (
    <Card className="border-[#E5E5E5] rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-[#0A0A0A] flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[#C41E3A]" />
          課程推薦分析
        </CardTitle>
        <p className="text-sm text-[#525252]">
          基於已購買相同課程的學員行為分析
        </p>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <p className="text-sm text-[#A3A3A3] text-center py-6">
            目前沒有足夠的購買資料進行分析
          </p>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.courseId}
                className="flex items-start gap-3 p-3 rounded-lg border border-[#E5E5E5] hover:bg-[#FAFAFA] transition-colors"
              >
                {/* 課程封面 */}
                <div className="w-16 h-10 rounded-md overflow-hidden bg-[#F5F5F5] flex-shrink-0">
                  {rec.coverImage ? (
                    <Image
                      src={rec.coverImage}
                      alt={rec.courseTitle}
                      width={64}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#A3A3A3] text-xs">
                      無圖
                    </div>
                  )}
                </div>

                {/* 課程資訊 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[#0A0A0A] truncate">
                      {rec.courseTitle}
                    </span>
                    {getRateBadge(rec.crossSellRate)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {rec.salePrice !== null && rec.salePrice < rec.price ? (
                      <>
                        <span className="text-xs font-medium text-[#C41E3A]">
                          {formatPrice(rec.salePrice)}
                        </span>
                        <span className="text-xs text-[#A3A3A3] line-through">
                          {formatPrice(rec.price)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-[#525252]">
                        {formatPrice(rec.price)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#A3A3A3] mt-1">
                    購買相同課程的 {rec.totalBuyersOfSharedCourses} 位學員中，有{" "}
                    {rec.crossSellCount} 位也購買了此課程
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
