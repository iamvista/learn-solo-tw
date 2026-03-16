// app/opengraph-image.tsx
// 首頁的 OG Image — 自由人學院品牌圖

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "自由人學院 — 不寫程式也能打造你的數位產品";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0A0A0A 0%, #1a1a2e 50%, #16213e 100%)",
          fontFamily: "sans-serif",
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

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#e11d48",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            自由人學院
          </div>
        </div>

        {/* Main title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: 900,
            marginBottom: 16,
          }}
        >
          不寫程式，也能打造你的
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            background: "linear-gradient(90deg, #e11d48, #f472b6)",
            backgroundClip: "text",
            color: "transparent",
            textAlign: "center",
          }}
        >
          數位產品
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: "#a1a1aa",
            marginTop: 24,
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          AI 時代的實戰課程 · 從想法到上線的完整方法
        </div>

        {/* Bottom domain */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#71717a",
            }}
          >
            learn.solo.tw
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
