import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "hinilas-pro.vercel.app" }],
        destination: "https://hinilas.pro/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
