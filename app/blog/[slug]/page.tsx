/**
 * /blog/[slug] — Artigo individual
 * Sem generateStaticParams — artigos cacheados via 'use cache' na primeira requisição.
 * Com cacheComponents + cacheLife('days'), desempenho equivalente a páginas estáticas.
 */
import { Suspense } from 'react';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getPostBySlug, getRelatedPosts, LOTTERY_LABELS } from '@/lib/blog';
import type { BlogPost } from '@/types/blog';

type Props = {
  params: Promise<{ slug: string }>;
};

// ─── Cached data fetcher — cache key = slug ───────────────────────────────────
async function getArticleData(slug: string): Promise<BlogPost | null> {
  'use cache';
  cacheLife('days');
  cacheTag(`blog-post-${slug}`, 'blog-posts');
  return getPostBySlug(slug);
}

// ─── SEO metadata ─────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getArticleData(slug);

  if (!post) return { title: 'Artigo não encontrado' };

  const canonicalUrl = `https://sorteiobilionario.com.br/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.meta_description,
    keywords: post.tags,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'article',
      locale: 'pt_BR',
      url: canonicalUrl,
      title: post.title,
      description: post.meta_description,
      publishedTime: post.published_at,
      tags: post.tags,
      images: post.cover_image_url
        ? [{ url: post.cover_image_url, alt: post.cover_alt, width: 1200, height: 630 }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.meta_description,
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
  };
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

  const publishedDate = new Date(post.published_at).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const lotteryLabel = post.lottery ? (LOTTERY_LABELS[post.lottery] ?? post.lottery) : null;

  return (
    <>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 mb-8">
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
        <div className="rounded-2xl overflow-hidden mb-8 aspect-video">
          <img
            src={post.cover_image_url}
            alt={post.cover_alt}
            className="w-full h-full object-cover"
            width={1200}
            height={630}
            loading="eager"
            decoding="async"
          />
        </div>
      )}

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
          {post.reading_time_min > 0 && <span>{post.reading_time_min} min de leitura</span>}
        </div>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400">
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Article body */}
      <article
        className="prose-lottery"
        dangerouslySetInnerHTML={{ __html: post.content_html }}
      />

      {/* Schema.org JSON-LD */}
      {post.schema_json && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(post.schema_json) }}
        />
      )}

      {/* CTA */}
      <div className="mt-10 p-6 rounded-2xl bg-[#f6d27a]/10 border border-[#f6d27a]/20 text-center">
        <p className="font-bold text-lg mb-2">Gere apostas com IA baseada em estatísticas</p>
        <p className="text-gray-400 text-sm mb-4">
          Analise dezenas quentes, frias e padrões históricos para jogar com mais estratégia.
        </p>
        <a
          href="https://sorteiobilionario.com.br"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f6d27a] text-black font-bold text-sm hover:bg-[#f6d27a]/90 transition-colors"
        >
          Acessar Sorteio Bilionário IA →
        </a>
      </div>

      {/* Related posts */}
      <Suspense fallback={null}>
        <RelatedPosts post={post} />
      </Suspense>

      {/* Source disclosure */}
      {post.source_urls && post.source_urls.length > 0 && (
        <footer className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-gray-600">
            Fontes:{' '}
            {post.source_urls.map((url, i) => (
              <span key={url}>
                {i > 0 && ', '}
                <a
                  href={url}
                  className="underline hover:text-gray-400"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
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
      <div className="h-4 w-32 bg-white/10 rounded" />
      <div className="aspect-video bg-white/10 rounded-2xl" />
      <div className="h-8 w-3/4 bg-white/10 rounded mt-6" />
      <div className="h-4 w-1/2 bg-white/10 rounded" />
      <div className="space-y-3 mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 bg-white/10 rounded" style={{ width: `${80 + (i % 3) * 10}%` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Wrapper resolves params promise at runtime (inside Suspense) ────────────
async function ArticleContentWrapper({
  paramsPromise,
}: {
  paramsPromise: Promise<{ slug: string }>;
}) {
  const { slug } = await paramsPromise;
  return <ArticleContent slug={slug} />;
}

// ─── Page entry point — NOT async, never touches runtime APIs directly ────────
export default function ArticlePage({ params }: Props) {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* ArticleContentWrapper resolves params then renders ArticleContent (cached per slug) */}
      <Suspense fallback={<ArticleSkeleton />}>
        <ArticleContentWrapper paramsPromise={params} />
      </Suspense>
    </main>
  );
}
