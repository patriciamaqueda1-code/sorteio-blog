/**
 * /blog — Listagem de artigos com paginação
 * Cache por hora, invalidado via cacheTag('blog-posts') quando novos artigos são publicados.
 */
import { Suspense } from 'react';
import { cacheLife, cacheTag } from 'next/cache';
import { getPublishedPosts } from '@/lib/blog';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { BlogPost } from '@/types/blog';
import { LOTTERY_LABELS } from '@/lib/blog';

const BASE_URL = 'https://blog.sorteiobilionario.com.br';

export const metadata: Metadata = {
  title: 'Blog de Loterias — Resultados e Análises',
  description:
    'Resultados e análises estatísticas das loterias brasileiras: Mega-Sena, Lotofácil, Quina, Lotomania e mais. Atualizado automaticamente após cada sorteio com IA.',
  keywords: [
    'resultado mega sena hoje', 'resultado lotofácil hoje', 'análise loterias',
    'blog loterias brasileiras', 'dezenas frequentes', 'resultado caixa hoje',
  ],
  alternates: { canonical: `${BASE_URL}/blog` },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' } },
  openGraph: {
    title: 'Blog de Loterias — Sorteio Bilionário IA',
    description: 'Resultados e análises estatísticas das loterias brasileiras. Atualizado após cada sorteio.',
    url: `${BASE_URL}/blog`,
    siteName: 'Sorteio Bilionário IA',
    locale: 'pt_BR',
    type: 'website',
    images: [{ url: 'https://sorteiobilionario.com.br/icons/icon-512.png', width: 512, height: 512 }],
  },
  twitter: { card: 'summary_large_image', title: 'Blog de Loterias — Sorteio Bilionário IA', description: 'Resultados e análises das loterias brasileiras com IA.' },
};

type Props = {
  searchParams: Promise<{ page?: string }>;
};

// ─── Cached component (cache key includes `page` number) ────────────────────
async function PostList({ page }: { page: number }) {
  'use cache';
  cacheLife('hours');
  cacheTag('blog-posts');

  const { posts, total } = await getPublishedPosts(page);
  const totalPages = Math.ceil(total / 12);

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">Nenhum artigo publicado ainda.</p>
        <p className="text-gray-600 text-sm mt-2">Os artigos são gerados automaticamente após cada sorteio.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post: BlogPost) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {totalPages > 1 && <Pagination current={page} total={totalPages} />}
    </>
  );
}

// ─── Post card ───────────────────────────────────────────────────────────────
function PostCard({ post }: { post: BlogPost }) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const lotteryLabel = post.lottery ? (LOTTERY_LABELS[post.lottery] ?? post.lottery) : 'Loteria';

  return (
    <article className="flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#f6d27a]/40 transition-colors group">
      {/* Cover */}
      {post.cover_image_url ? (
        <div className="aspect-video overflow-hidden">
          <img
            src={post.cover_image_url}
            alt={post.cover_alt}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
            width={640}
            height={360}
          />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-purple-900/40 via-[#07060d] to-emerald-900/20 flex items-center justify-center">
          <span className="text-5xl" role="img" aria-label={lotteryLabel}>🎰</span>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-[#f6d27a] uppercase tracking-wider">
            {lotteryLabel}
          </span>
          {post.reading_time_min > 0 && (
            <>
              <span className="text-gray-700">·</span>
              <span className="text-xs text-gray-500">{post.reading_time_min} min de leitura</span>
            </>
          )}
        </div>

        <h2 className="text-white font-semibold text-base leading-snug mb-2 line-clamp-2 flex-1">
          <Link
            href={`/blog/${post.slug}`}
            className="hover:text-[#f6d27a] transition-colors"
          >
            {post.title}
          </Link>
        </h2>

        <p className="text-gray-400 text-sm line-clamp-3 mb-4">{post.excerpt}</p>

        {date && (
          <time className="text-xs text-gray-600" dateTime={post.published_at}>
            {date}
          </time>
        )}
      </div>
    </article>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ current, total }: { current: number; total: number }) {
  const prev = current - 1;
  const next = current + 1;

  return (
    <nav aria-label="Paginação do blog" className="flex justify-center items-center gap-3 mt-12">
      {current > 1 && (
        <Link
          href={prev === 1 ? '/blog' : `/blog?page=${prev}`}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-white transition-colors"
        >
          ← Anterior
        </Link>
      )}
      <span className="px-4 py-2 text-sm text-gray-400">
        Página {current} de {total}
      </span>
      {current < total && (
        <Link
          href={`/blog?page=${next}`}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-white transition-colors"
        >
          Próxima →
        </Link>
      )}
    </nav>
  );
}

// ─── Skeleton shown while PostList streams in ────────────────────────────────
function PostListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="aspect-video bg-white/10" />
          <div className="p-5 space-y-3">
            <div className="h-3 w-20 bg-white/10 rounded" />
            <div className="h-5 w-full bg-white/10 rounded" />
            <div className="h-5 w-3/4 bg-white/10 rounded" />
            <div className="h-3 w-1/2 bg-white/10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Wrapper resolves searchParams promise at runtime (inside Suspense) ──────
async function PostListWrapper({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParamsPromise;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  return <PostList page={page} />;
}

// ─── Page — NOT async, never touches runtime APIs directly ─────────────────
export default function BlogIndexPage({ searchParams }: Props) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero header — static, included in prerendered shell */}
      <header className="text-center mb-12">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-[#f6d27a]/10 border border-[#f6d27a]/20">
          <span className="text-[#f6d27a] text-sm font-medium">📰 Blog de Loterias Brasileiras</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Resultados e{' '}
          <span className="text-[#f6d27a]">Análises Estatísticas</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
          Acompanhe os resultados de cada sorteio com análise profissional baseada em dados reais da Caixa Econômica Federal.
        </p>
      </header>

      {/* PostListWrapper resolves searchParams promise then renders PostList (cached) */}
      <Suspense fallback={<PostListSkeleton />}>
        <PostListWrapper searchParamsPromise={searchParams} />
      </Suspense>

      {/* Bottom CTA — static, prerendered */}
      <section className="mt-16 py-12 border-t border-white/10 text-center">
        <h2 className="text-2xl font-bold mb-3">Quer aumentar suas chances?</h2>
        <p className="text-gray-400 mb-6 max-w-lg mx-auto">
          Nossa IA analisa histórico de dezenas e gera apostas estatisticamente otimizadas para Mega-Sena, Lotofácil e mais.
        </p>
        <a
          href="https://sorteiobilionario.com.br"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f6d27a] text-black font-bold hover:bg-[#f6d27a]/90 transition-colors text-sm"
        >
          Experimentar Grátis →
        </a>
      </section>
    </main>
  );
}
