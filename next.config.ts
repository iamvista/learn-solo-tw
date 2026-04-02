import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400, // 24 hours（降低 Image Optimization 費用）
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-ddbec9d8c71d4d4ca7cbece3e070e19f.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.learn.solo.tw",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "customer-xxx.cloudflarestream.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
    ],
  },

  // 安全標頭（SEO 排名信號 + 安全性強化）
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
  ],
};

export default nextConfig;
