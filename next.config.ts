import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["lh3.googleusercontent.com"],
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
