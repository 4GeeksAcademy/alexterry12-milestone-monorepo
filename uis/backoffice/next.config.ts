import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Absolute monorepo root so Turbopack resolves imports from repo-root `src/`.
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
  },
};

export default nextConfig;
