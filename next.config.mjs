let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: false,
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'INP', 'TTFB'],
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Add a custom resolver for problematic modules
    config.resolve.alias = {
      ...config.resolve.alias,
      'superpookieball': './components/superpookieball-game.tsx',
      // Ignore optional pretty printer dependency
      'pino-pretty': false,
    };
    
    // Remove legacy babel-loader rule; Next.js uses SWC by default

    // Fixed optimization to avoid the conflict between usedExports and cacheUnaffected
    config.optimization = {
      ...config.optimization,
      sideEffects: true,
    };
    
    // In production, apply more aggressive optimizations
    if (!dev) {
      config.optimization.minimize = true;
      // Use TersePlugin without conflicting options
      config.optimization.minimizer = [
        ...config.optimization.minimizer || [],
        new webpack.optimize.AggressiveMergingPlugin(),
      ];
    }
    
    return config;
  },
  reactStrictMode: false,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  compress: true,
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig
