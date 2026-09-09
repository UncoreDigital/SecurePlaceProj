import type { NextConfig } from "next";

// Supabase Storage serves every uploaded image, so next/image has to be told the
// host is allowed. The hostname is derived from the project URL rather than
// hardcoded, so dev and prod each allow their own project and nothing else.
// The path is pinned to the public object route: without it, this would let the
// image optimiser be pointed at any path on the host.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

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
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https" as const,
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
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
