import type { MetadataRoute } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { getAllPublishedSlugs, LOTTERY_LABELS } from '@/lib/blog';

const LOTTERY_KEYS = Object.keys(LOTTERY_LABELS);

// Cached 1 hour — revalidated by cacheTag('blog-posts') when new posts are published
async function getSlugsCached(): Promise<string[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('blog-posts');
  return getAllPublishedSlugs();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getSlugsCached();
  const base = 'https://blog.sorteiobilionario.com.br';
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${base}/blog`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  // Páginas de categoria por loteria — alta prioridade (autoridade tópica)
  const categoryRoutes: MetadataRoute.Sitemap = LOTTERY_KEYS.map((lottery) => ({
    url: `${base}/blog/loteria/${lottery}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  const articleRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...articleRoutes];
}
