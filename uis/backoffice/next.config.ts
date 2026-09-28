import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Absolute monorepo root so Turbopack resolves imports from repo-root `src/`.
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
  },
  async rewrites() {
    if (!process.env.API_INTERNAL_URL) {
      return [];
    }
    return [
      {
        source: "/backend/:path*",
        destination: `${process.env.API_INTERNAL_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
