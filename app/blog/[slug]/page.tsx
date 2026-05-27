/**
 * /blog/[slug] — Artigo individual
 * SEO 100%: NewsArticle, BreadcrumbList, WebPage schemas + OG + Twitter + canonical
 * Suporte a vídeo: YouTube, Facebook, MP4, TikTok, Instagram, outros
 */
import { Suspense } from 'react';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getPostBySlug, getRelatedPosts, LOTTERY_LABELS } from '@/lib/blog';
import type { BlogPost } from '@/types/blog';

const BASE_URL = 'https://sorteiobilionario.com.br';

type Props = { params: Promise<{ slug: string }> };

// ─── Cached data fetcher ──────────────────────────────────────────────────────
async function getArticleData(slug: string): Promise<BlogPost | null> {
  'use cache';
  cacheLife('days');
  cacheTag(`blog-post-${slug}`, 'blog-posts');
  return getPostBySlug(slug);
}

// ─── SEO metadata — 100% otimizado ──────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getArticleData(slug);
  if (!post) return { title: 'Artigo não encontrado' };

  const canonicalUrl = `${BASE_URL}/blog/${post.slug}`;
  const lotteryLabel = post.lottery ? (LOTTERY_LABELS[post.lottery] ?? post.lottery) : 'Loterias';
  const wordCount = post.content_html.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;

  return {
    title: post.title,
    description: post.meta_description,
    keywords: [
      ...post.tags,
      lotteryLabel,
      'loterias brasileiras',
      'resultado loteria',
      'análise estatística',
      'Caixa Econômica Federal',
    ],
    authors: [{ name: 'Sorteio Bilionário IA', url: BASE_URL }],
    creator: 'Sorteio Bilionário IA',
    publisher: 'Sorteio Bilionário IA',
    category: 'Loterias',
    alternates: { canonical: canonicalUrl },
    robots: {
      index: true, follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    },
    openGraph: {
      type: 'article',
      locale: 'pt_BR',
      siteName: 'Sorteio Bilionário IA',
      url: canonicalUrl,
      title: post.title,
      description: post.meta_description,
      publishedTime: post.published_at,
      modifiedTime: post.published_at,
      section: lotteryLabel,
      tags: post.tags,
      images: post.cover_image_url
        ? [{ url: post.cover_image_url, alt: post.cover_alt, width: 1360, height: 768, type: 'image/jpeg' }]
        : [{ url: `${BASE_URL}/icons/icon-512.png`, width: 512, height: 512 }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@SorteioBilionario',
      title: post.title,
      description: post.meta_description,
      images: post.cover_image_url ? [{ url: post.cover_image_url, alt: post.cover_alt }] : undefined,
    },
    other: {
      'article:author': 'Sorteio Bilionário IA',
      'article:section': lotteryLabel,
      'article:word_count': String(wordCount),
      'article:reading_time': String(post.reading_time_min),
    },
  };
}

// ─── Video embed (server-safe — sem scripts client) ────────────────────────
function VideoEmbed({ url }: { url: string }) {
  // YouTube — https://youtube.com/watch?v=ID ou https://youtu.be/ID
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (ytMatch) {
    return (
      <div className="relative my-8 rounded-2xl overflow-hidden" style={{ paddingBottom: '56.25%', height: 0 }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`}
          title="Vídeo YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  // Facebook video
  if (url.includes('facebook.com') && (url.includes('/videos/') || url.includes('/reel/'))) {
    const encoded = encodeURIComponent(url);
    return (
      <div className="relative my-8 rounded-2xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%', height: 0 }}>
        <iframe
          src={`https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&width=734`}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  // MP4 / WebM direto
  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(url)) {
    return (
      <div className="my-8 rounded-2xl overflow-hidden bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video controls preload="metadata" className="w-full rounded-2xl" style={{ maxHeight: '480px' }}>
          <source src={url} type="video/mp4" />
          Seu navegador não suporta o player de vídeo.
        </video>
      </div>
    );
  }

  // TikTok / Instagram / outros — botão com link
  const isKnown = url.includes('tiktok.com') || url.includes('instagram.com') || url.includes('twitter.com') || url.includes('x.com');
  const icon = url.includes('tiktok.com') ? '🎵' : url.includes('instagram.com') ? '📸' : '🎬';
  const platform = url.includes('tiktok.com') ? 'TikTok' : url.includes('instagram.com') ? 'Instagram' : 'Ver vídeo';

  return (
    <div className="my-8 flex justify-center">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/15 hover:border-[#f6d27a]/40 hover:bg-white/10 transition-all text-white font-medium"
      >
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="font-semibold">{isKnown ? `Ver no ${platform}` : platform}</p>
          <p className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">{url}</p>
        </div>
        <span className="text-gray-500 ml-2">↗</span>
      </a>
    </div>
  );
}

// ─── Related posts (cached separately) ───────────────────────────────────────
async function RelatedPosts({ post }: { post: BlogPost }) {
  'use cache';
  cacheLife('hours');
  cacheTag('blog-posts');

  const related = await getRelatedPosts(post, 3);
  if (related.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-white/10">
      <h2 className="text-xl font-bold mb-6">Artigos Relacionados</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {related.map((r) => (
          <Link
            key={r.id}
            href={`/blog/${r.slug}`}
            className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#f6d27a]/40 transition-colors"
          >
            {r.cover_image_url && (
              <div className="aspect-video overflow-hidden rounded-lg mb-3">
                <img src={r.cover_image_url} alt={r.cover_alt} className="w-full h-full object-cover" loading="lazy" width={320} height={180} />
              </div>
            )}
            <p className="text-xs text-[#f6d27a] font-medium uppercase tracking-wider mb-1">
              {r.lottery ? (LOTTERY_LABELS[r.lottery] ?? r.lottery) : 'Loteria'}
            </p>
            <p className="text-sm text-white font-semibold line-clamp-2">{r.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Article body — cached per slug ──────────────────────────────────────────
async function ArticleContent({ slug }: { slug: string }) {
  'use cache';
  cacheLife('days');
  cacheTag(`blog-post-${slug}`, 'blog-posts');

  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const canonicalUrl = `${BASE_URL}/blog/${post.slug}`;
  const publishedDate = new Date(post.published_at).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const lotteryLabel = post.lottery ? (LOTTERY_LABELS[post.lottery] ?? post.lottery) : null;
  const wordCount = post.content_html.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;

  // ── JSON-LD completo: NewsArticle + BreadcrumbList + WebPage ─────────────
  const newsArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.meta_description,
    articleBody: post.content_html.replace(/<[^>]+>/g, '').slice(0, 500) + '…',
    wordCount,
    inLanguage: 'pt-BR',
    articleSection: lotteryLabel ?? 'Loterias',
    keywords: post.tags.join(', '),
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: { '@type': 'Organization', name: 'Sorteio Bilionário IA', url: BASE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Sorteio Bilionário IA',
      url: BASE_URL,
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/icons/icon-512.png`, width: 512, height: 512 },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    image: post.cover_image_url
      ? [{ '@type': 'ImageObject', url: post.cover_image_url, caption: post.cover_alt, width: 1360, height: 768 }]
      : [{ '@type': 'ImageObject', url: `${BASE_URL}/icons/icon-512.png` }],
    ...(post.video_url && {
      video: {
        '@type': 'VideoObject',
        name: post.title,
        description: post.meta_description,
        contentUrl: post.video_url,
        thumbnailUrl: post.cover_image_url ?? `${BASE_URL}/icons/icon-512.png`,
        uploadDate: post.published_at,
      },
    }),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
      ...(lotteryLabel ? [{ '@type': 'ListItem', position: 3, name: lotteryLabel, item: `${BASE_URL}/blog?lottery=${post.lottery}` }] : []),
      { '@type': 'ListItem', position: lotteryLabel ? 4 : 3, name: post.title, item: canonicalUrl },
    ],
  };

  return (
    <>
      {/* Breadcrumb visual */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 mb-8 flex-wrap">
        <Link href="/" className="hover:text-[#f6d27a] transition-colors">Início</Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-[#f6d27a] transition-colors">Blog</Link>
        {lotteryLabel && (
          <>
            <span>/</span>
            <span className="text-[#f6d27a]">{lotteryLabel}</span>
          </>
        )}
      </nav>

      {/* Cover image */}
      {post.cover_image_url && (
        <div className="rounded-2xl overflow-hidden mb-8 aspect-video shadow-2xl shadow-black/40">
          <img
            src={post.cover_image_url}
            alt={post.cover_alt}
            className="w-full h-full object-cover"
            width={1360}
            height={768}
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>
      )}

      {/* Video embed (se houver) */}
      {post.video_url && <VideoEmbed url={post.video_url} />}

      {/* Header */}
      <header className="mb-8">
        {lotteryLabel && (
          <p className="text-[#f6d27a] text-sm font-semibold uppercase tracking-wider mb-3">
            {lotteryLabel}
            {post.concurso_number ? ` — Concurso ${post.concurso_number}` : ''}
          </p>
        )}
        <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
          <time dateTime={post.published_at}>{publishedDate}</time>
          {post.reading_time_min > 0 && <span>· {post.reading_time_min} min de leitura</span>}
          <span>· {wordCount} palavras</span>
        </div>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4" role="list" aria-label="Tags do artigo">
            {post.tags.map((tag) => (
              <span key={tag} role="listitem" className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 hover:border-[#f6d27a]/30 hover:text-[#f6d27a] transition-colors cursor-default">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Article body */}
      <article
        className="prose-lottery"
        dangerouslySetInnerHTML={{ __html: post.content_html }}
        itemScope
        itemType="https://schema.org/Article"
      />

      {/* JSON-LD schemas */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* CTA */}
      <div className="mt-10 p-6 rounded-2xl bg-[#f6d27a]/10 border border-[#f6d27a]/20 text-center">
        <p className="font-bold text-lg mb-2">🎯 Gere apostas com IA baseada em estatísticas reais</p>
        <p className="text-gray-400 text-sm mb-4 max-w-md mx-auto">
          Analise dezenas quentes, frias e padrões históricos. Nossa IA gera combinações otimizadas para Mega-Sena, Lotofácil e mais.
        </p>
        <a
          href={BASE_URL}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f6d27a] text-black font-bold text-sm hover:bg-[#f6d27a]/90 transition-colors"
          rel="noopener"
        >
          Acessar Sorteio Bilionário IA →
        </a>
      </div>

      {/* Related posts */}
      <Suspense fallback={null}>
        <RelatedPosts post={post} />
      </Suspense>

      {/* Sources */}
      {post.source_urls && post.source_urls.length > 0 && (
        <footer className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-gray-600">
            Fontes:{' '}
            {post.source_urls.map((url, i) => (
              <span key={url}>
                {i > 0 && ', '}
                <a href={url} className="underline hover:text-gray-400" target="_blank" rel="noopener noreferrer nofollow">
                  {(() => { try { return new URL(url).hostname; } catch { return url; } })()}
                </a>
              </span>
            ))}
          </p>
        </footer>
      )}
    </>
  );
}

// ─── Article skeleton ─────────────────────────────────────────────────────────
function ArticleSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-48 bg-white/10 rounded" />
      <div className="aspect-video bg-white/10 rounded-2xl" />
      <div className="h-8 w-3/4 bg-white/10 rounded mt-6" />
      <div className="h-4 w-1/2 bg-white/10 rounded" />
      <div className="flex gap-2 mt-3">
        {[60, 80, 50].map((w) => <div key={w} className="h-5 bg-white/10 rounded-full" style={{ width: `${w}px` }} />)}
      </div>
      <div className="space-y-3 mt-8">
        {[100, 90, 80, 95, 85, 70, 100, 88].map((w, i) => (
          <div key={i} className="h-4 bg-white/10 rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

async function ArticleContentWrapper({ paramsPromise }: { paramsPromise: Promise<{ slug: string }> }) {
  const { slug } = await paramsPromise;
  return <ArticleContent slug={slug} />;
}

export default function ArticlePage({ params }: Props) {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Suspense fallback={<ArticleSkeleton />}>
        <ArticleContentWrapper paramsPromise={params} />
      </Suspense>
    </main>
  );
}
