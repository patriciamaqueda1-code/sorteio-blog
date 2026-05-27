import type { NextConfig } from 'next';

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com;
  style-src 'self' 'unsafe-inline';
  font-src 'self';
  img-src 'self' data: blob: https:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
`.replace(/\n/g, ' ').trim();

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',            value: 'on' },
  { key: 'X-Content-Type-Options',            value: 'nosniff' },
  { key: 'X-Frame-Options',                   value: 'DENY' },
  { key: 'X-XSS-Protection',                 value: '1; mode=block' },
  { key: 'Referrer-Policy',                   value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security',         value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy',               value: 'geolocation=(), microphone=(), camera=()' },
  { key: 'Cross-Origin-Opener-Policy',        value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy',      value: 'same-origin' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'Content-Security-Policy',           value: ContentSecurityPolicy },
];

const config: NextConfig = {
  cacheComponents: true,   // Next 16: enables 'use cache' + PPR
  turbopack: {
    root: __dirname,       // eliminates "workspace root" warning in monorepos
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
  compress: true,
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
};

export default config;
