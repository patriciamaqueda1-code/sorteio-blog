/**
 * GET /feed.xml — RSS 2.0 feed do blog de loterias
 * Ajuda o Google a descobrir novos artigos mais rapidamente.
 * Cached 1h, invalidado com blog-posts tag.
 *
 * NOTE: 'use cache' cannot be used directly on Route Handlers (they return
 * non-serializable Response objects). Instead, the data-fetching logic lives
 * in a separate 'use cache' function that returns plain serializable data.
 */
import { NextResponse } from 'next/server';
import { cacheTag, cacheLife } from 'next/cache';
import { supabase } from '@/lib/supabase';

const BASE_URL = 'https://blog.sorteiobilionario.com.br';
const SITE_NAME = 'Blog de Loterias — Sorteio Bilionário IA';
const SITE_DESC = 'Resultados e análises estatísticas das loterias brasileiras. Atualizado automaticamente após cada sorteio com IA.';

type FeedPost = {
  slug: string;
  title: string;
  excerpt: string;
  meta_description: string;
  published_at: string;
  lottery: string | null;
  tags: string[];
  cover_image_url: string | null;
};

// Separate cached function — returns plain serializable data (not a Response)
async function fetchFeedPosts(): Promise<FeedPost[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('blog-posts');

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, meta_description, published_at, lottery, tags, cover_image_url')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20);

  return (posts ?? []) as FeedPost[];
}

export async function GET() {
  const posts = await fetchFeedPosts();

  const items = posts.map((post) => {
    const url = `${BASE_URL}/${post.slug}`;
    const description = (post.excerpt || post.meta_description).replace(/[<>&'"]/g, (c: string) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] ?? c)
    );
    const title = post.title.replace(/[<>&'"]/g, (c: string) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] ?? c)
    );
    const pubDate = new Date(post.published_at).toUTCString();
    const categories = (post.tags ?? []).map((tag: string) => `    <category>${tag}</category>`).join('\n');
    const enclosure = post.cover_image_url
      ? `    <enclosure url="${post.cover_image_url}" type="image/jpeg" length="0" />`
      : '';

    return `  <item>
    <title>${title}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <description>${description}</description>
    <pubDate>${pubDate}</pubDate>
${categories}
${enclosure}
  </item>`;
  });

  const now = new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${BASE_URL}/blog</link>
    <description>${SITE_DESC}</description>
    <language>pt-BR</language>
    <lastBuildDate>${now}</lastBuildDate>
    <managingEditor>contato@sorteiobilionario.com.br (Sorteio Bilionário IA)</managingEditor>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>https://sorteiobilionario.com.br/icons/icon-512.png</url>
      <title>${SITE_NAME}</title>
      <link>${BASE_URL}/blog</link>
    </image>
${items.join('\n')}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
