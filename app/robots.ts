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
    sitemap: 'https://sorteiobilionario.com.br/blog/sitemap.xml',
    host: 'https://sorteiobilionario.com.br',
  };
}
