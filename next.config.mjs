/** @type {import('next').NextConfig} */
import bundleAnalyzer from '@next/bundle-analyzer';

// Hosts that must be reachable from the browser:
//   - *.googleapis.com           — Firebase Auth, Firestore, Identity Toolkit
//   - *.firebaseio.com           — legacy Realtime DB host (kept for SDK compat)
//   - *.firebaseapp.com          — auth iframe / OAuth redirects
//   - wss://*.firebaseio.com     — Firestore long-polling fallback
//   - https://firestore.googleapis.com — Firestore REST + Listen
//   - *.cloudfunctions.net       — Firebase Cloud Functions v2 callable endpoints
const FIREBASE_CONNECT = [
  'https://*.googleapis.com',
  'https://*.firebaseio.com',
  'wss://*.firebaseio.com',
  'https://*.firebaseapp.com',
  'https://firestore.googleapis.com',
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://*.cloudfunctions.net',
].join(' ');

// 'unsafe-inline' / 'unsafe-eval' on script-src are required by Next.js's
// hydration runtime and dev-mode Fast Refresh. Tightening to a nonce-based
// CSP requires a custom server / middleware injection — a future hardening
// pass once Phase 3 (server-authoritative rewards) lands.
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  `worker-src blob:`,
  `connect-src 'self' ${FIREBASE_CONNECT}`,
  `frame-src 'self' https://*.firebaseapp.com`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `upgrade-insecure-requests`,
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: cspDirectives },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

// Wrap with bundle analyzer. Only active when ANALYZE=true — zero overhead in
// normal dev and production builds.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
export default withBundleAnalyzer(nextConfig);
