import type { NextConfig } from 'next';
import path from 'path';

const monorepoRoot = path.join(__dirname, '../..');

const nextConfig: NextConfig = {
  transpilePackages: ['@careersignal/shared', '@careersignal/db'],
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  serverExternalPackages: ['postgres'],
  // Allow the containerized dev browser (host.docker.internal) to load HMR resources.
  allowedDevOrigins: ['host.docker.internal'],
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
};

export default nextConfig;
