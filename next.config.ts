import type { NextConfig } from 'next';
import { RELEASE_IDS, RELEASES, shopPath } from './src/app/demo-shop/_config/releases';
import { securityHeaders } from './src/server/security/securityHeaders';

const isDevelopment = process.env.NODE_ENV === 'development';

// Kota Express releases with the seeded clickjacking misconfiguration. A later rule overrides the
// same header keys set by an earlier one, so these replace the protective values on those paths.
const framedShopRules = RELEASE_IDS.filter((id) => RELEASES[id].bugs.framingAllowed).flatMap(
  (id) => {
    const headers = [...securityHeaders({ isDevelopment, allowFraming: true })];
    return [
      { source: shopPath(id), headers },
      { source: `${shopPath(id)}/:path*`, headers },
    ];
  },
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The dev tools badge would add a button to every page snapshot in development only, so dev
  // and production runs would build different prompts and miss each other's replays.
  devIndicators: false,
  headers() {
    return Promise.resolve([
      { source: '/:path*', headers: [...securityHeaders({ isDevelopment })] },
      ...framedShopRules,
    ]);
  },
};

export default nextConfig;
