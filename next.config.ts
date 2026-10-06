import type { NextConfig } from 'next';
import { securityHeaders } from './src/server/security/securityHeaders';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers() {
    const headers = securityHeaders(process.env.NODE_ENV === 'development');
    return Promise.resolve([{ source: '/:path*', headers: [...headers] }]);
  },
};

export default nextConfig;
