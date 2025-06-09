
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // This fallback is for Webpack (e.g., `next build` or `next dev` without --turbopack)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'async_hooks': false, // Tells Webpack to provide an empty module for 'async_hooks' on the client
      };
    }

    // Important: return the modified config
    return config;
  },
  // Turbopack specific configuration
  turbo: {
    resolveAlias: {
      // Alias async_hooks to false for the browser (client-side) environment
      // This mimics the webpack resolve.fallback behavior for Turbopack
      browser: {
        async_hooks: false,
      },
    },
  },
  ...(process.env.NODE_ENV === 'development' && {
    devIndicators: {
      position: 'bottom-right',
    },
  }),
};

export default nextConfig;
