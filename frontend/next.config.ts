import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    // External generated image URLs come from unpredictable CDN domains,
    // so we keep unoptimized=true for external images.
    // Local images (e.g. /logo.svg) are served statically and don't need optimization.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "apihub.agnes-ai.com",
      },
      {
        protocol: "https",
        hostname: "**.agnes-ai.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || "",
  },
}

export default nextConfig
