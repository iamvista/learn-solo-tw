import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
};

export default nextConfig;
