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
  // Redireciona URLs antigas /blog/:slug → /:slug (SEO 301 permanente)
  async redirects() {
    return [
      // /blog (listagem) → / (root subdomínio — evita URL redundante)
      {
        source: '/blog',
        destination: '/',
        permanent: true,
      },
      // /blog/:slug (artigos antigos) → /:slug
      {
        source: '/blog/:slug((?!loteria|page).*)',
        destination: '/:slug',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Homepage: cache 5 minutes at CDN, stale-while-revalidate 1 hour
      {
        source: '/',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=3600' }],
      },
      // Article pages: cache 1 hour at CDN, stale-while-revalidate 24 hours
      {
        source: '/:slug((?!_next|api|favicon|icons|og-image).*)',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' }],
      },
    ];
  },
  compress: true,
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', '@supabase/ssr', 'groq-sdk'],
  },
};

export default config;
