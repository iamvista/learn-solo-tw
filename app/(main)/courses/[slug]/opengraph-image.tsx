// app/(main)/courses/[slug]/opengraph-image.tsx
// 課程銷售頁的動態 OG Image

import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "課程介紹";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const course = await prisma.course.findFirst({
    where: { slug },
    select: {
      title: true,
      subtitle: true,
      salePrice: true,
      price: true,
      saleLabel: true,
      instructorName: true,
    },
  });

  const title = course?.title || "課程";
  const subtitle = course?.subtitle || "";
  const price = course?.salePrice || course?.price;
  const saleLabel = course?.saleLabel;
  const instructor = course?.instructorName || "自由人學院";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0A0A0A 0%, #1a1a2e 50%, #16213e 100%)",
          fontFamily: "sans-serif",
          padding: 60,
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #e11d48, #f59e0b, #e11d48)",
          }}
        />

        {/* Top section */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Badge row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#e11d48",
                letterSpacing: "0.15em",
              }}
            >
              自由人學院
            </div>
            {saleLabel && (
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#fbbf24",
                  background: "rgba(251, 191, 36, 0.15)",
                  padding: "4px 12px",
                  borderRadius: 20,
                }}
              >
                {saleLabel}
              </div>
            )}
          </div>

          {/* Course title */}
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.2,
              maxWidth: 900,
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <div
              style={{
                fontSize: 26,
                color: "#a1a1aa",
                marginTop: 16,
                maxWidth: 800,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Bottom section */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 18, color: "#71717a" }}>
              {instructor}
            </div>
            <div style={{ fontSize: 18, color: "#3f3f46" }}>·</div>
            <div style={{ fontSize: 18, color: "#71717a" }}>
              learn.solo.tw
            </div>
          </div>

          {price && (
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "#ffffff",
              }}
            >
              NT${price.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
