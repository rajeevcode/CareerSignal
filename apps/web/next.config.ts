import type { NextConfig } from 'next';
import path from 'path';

const monorepoRoot = path.join(__dirname, '../..');

const nextConfig: NextConfig = {
  transpilePackages: ['@careersignal/shared', '@careersignal/db'],
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  serverExternalPackages: ['better-sqlite3'],
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
};

export default nextConfig;
