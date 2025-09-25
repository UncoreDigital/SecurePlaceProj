import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  // This block disables ESLint checking during the build.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
