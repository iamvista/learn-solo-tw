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
        hostname: "course-storage.ray-realms.com",
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
  // PostHog reverse proxy rewrites to avoid ad blockers
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
