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
  experimental: {
    turbopack: {
      resolveAlias: {
        // For Turbopack, alias 'async_hooks' to false (empty module).
        // This applies to client-side bundles where 'async_hooks' is not available.
        'async_hooks': false,
      },
    },
  },
};

export default nextConfig;
