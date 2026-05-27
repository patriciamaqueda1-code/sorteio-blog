import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: [
      'https://blog.sorteiobilionario.com.br/sitemap.xml',
      'https://blog.sorteiobilionario.com.br/feed.xml',
    ],
    host: 'https://blog.sorteiobilionario.com.br',
  };
}
