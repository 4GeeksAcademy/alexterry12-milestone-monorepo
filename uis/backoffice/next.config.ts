import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Absolute monorepo root so Turbopack resolves imports from repo-root `src/`.
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
  },
  async redirects() {
    return [
      {
        source: "/backoffice/inventory/:path*",
        destination: "/inventory/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
