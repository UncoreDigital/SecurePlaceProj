import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  // This block disables ESLint checking during the build.
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Basic performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Advanced performance optimizations
  reactStrictMode: true,
  swcMinify: true,
  
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Optimize React server components
    optimizeServerReact: true,
    // Enable webpack 5 optimizations
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-alert-dialog'
    ]
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Bundle optimization
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase}}",
      skipDefaultConversion: true
    }
  },
  
  // Caching optimization
  staticPageGenerationTimeout: 600,
  
  // Turbopack optimizations
  transpilePackages: [],
};

export default nextConfig;
