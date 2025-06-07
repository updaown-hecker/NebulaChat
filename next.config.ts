
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
  // The 'experimental.turbopack' configuration was removed because Next.js 15.3.3
  // reported 'turbopack' as an unrecognized key within the 'experimental' object.
  // This fixed the immediate config validation error.
  // However, this means there's no explicit Turbopack config for 'async_hooks' aliasing.
  // If 'async_hooks' issues persist with Turbopack, a different approach for this Next.js
  // version might be needed, or it could indicate a bug in Next.js 15.3.3 config handling.
  // The Webpack fallback for 'async_hooks' remains.
  ...(process.env.NODE_ENV === 'development' && {
    devIndicators: {
      buildActivityPosition: 'bottom-right',
    },
    experimental: {
        allowedDevOrigins: [
            'https://6000-firebase-studio-1749331662472.cluster-joak5ukfbnbyqspg4tewa33d24.cloudworkstations.dev',
        ],
    }
  }),
};

export default nextConfig;
