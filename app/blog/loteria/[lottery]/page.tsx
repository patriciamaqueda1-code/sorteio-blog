/**
 * /blog/loteria/[lottery] — Página de categoria por loteria
 * Autoridade tópica + keywords específicas por modalidade.
 * Cached por hora, invalidado quando novos posts são publicados.
 */
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { cacheLife, cacheTag } from 'next/cache';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getPostsByLottery, LOTTERY_LABELS } from '@/lib/blog';
import type { BlogPost } from '@/types/blog';

const BASE_URL = 'https://blog.sorteiobilionario.com.br';
const MAIN_SITE_URL = 'https://sorteiobilionario.com.br';

// Descrições otimizadas por loteria para SEO
const LOTTERY_DESCRIPTIONS: Record<string, { title: string; description: string; keywords: string[] }> = {
  megasena: {
    title: 'Mega-Sena — Resultados, Análises e Dezenas Sorteadas',
    description: 'Acompanhe todos os resultados da Mega-Sena com análise estatística completa das dezenas sorteadas. Dezenas quentes, frias e dicas baseadas em dados oficiais da Caixa.',
    keywords: ['resultado mega sena hoje', 'mega sena resultado', 'mega sena acumulada', 'dezenas mega sena', 'análise mega sena', 'mega sena concurso'],
  },
  lotofacil: {
    title: 'Lotofácil — Resultados, Análises e Dezenas Sorteadas',
    description: 'Todos os resultados da Lotofácil com análise estatística das dezenas mais sorteadas. Acompanhe concursos, dezenas quentes e frias com dados oficiais da Caixa Econômica Federal.',
    keywords: ['resultado lotofácil hoje', 'lotofácil resultado', 'dezenas lotofácil', 'análise lotofácil', 'lotofácil concurso', 'lotofácil acumulada'],
  },
  quina: {
    title: 'Quina — Resultados, Análises e Dezenas Sorteadas',
    description: 'Resultados da Quina com análise estatística completa. Dezenas mais frequentes, probabilidades e análise de cada concurso com dados oficiais da Caixa Econômica Federal.',
    keywords: ['resultado quina hoje', 'quina resultado', 'dezenas quina', 'análise quina', 'quina acumulada', 'quina concurso'],
  },
  lotomania: {
    title: 'Lotomania — Resultados, Análises e Concursos',
    description: 'Resultados da Lotomania com análise estatística. Acompanhe concursos, acerto zero e dezenas sorteadas com dados oficiais da Caixa Econômica Federal.',
    keywords: ['resultado lotomania', 'lotomania resultado', 'lotomania acerto zero', 'dezenas lotomania', 'análise lotomania'],
  },
  duplasena: {
    title: 'Dupla Sena — Resultados, Análises e Concursos',
    description: 'Resultados da Dupla Sena com análise dos dois sorteios por concurso. Dezenas quentes, frias e estatísticas completas da Caixa Econômica Federal.',
    keywords: ['resultado dupla sena', 'dupla sena resultado', 'dupla sena sorteio', 'dezenas dupla sena', 'análise dupla sena'],
  },
  milionaria: {
    title: '+Milionária — Resultados, Análises e Concursos',
    description: 'Resultados da +Milionária com análise estatística dos números e trevos sorteados. Acompanhe concursos milionários com dados da Caixa Econômica Federal.',
    keywords: ['resultado milionária', 'mais milionária resultado', 'milionária trevos', 'análise milionária', 'milionária sorteio'],
  },
  timemania: {
    title: 'Timemania — Resultados, Análises e Concursos',
    description: 'Resultados da Timemania com análise estatística. Dezenas sorteadas, Time do Coração e estatísticas por concurso com dados oficiais da Caixa Econômica Federal.',
    keywords: ['resultado timemania', 'timemania resultado', 'timemania time coração', 'dezenas timemania', 'análise timemania'],
  },
  diadesorte: {
    title: 'Dia de Sorte — Resultados, Análises e Concursos',
    description: 'Resultados do Dia de Sorte com análise dos números e Mês da Sorte sorteados. Estatísticas completas por concurso com dados da Caixa Econômica Federal.',
    keywords: ['resultado dia de sorte', 'dia de sorte resultado', 'dia de sorte mês', 'dezenas dia de sorte', 'análise dia de sorte'],
  },
  supersete: {
    title: 'Super Sete — Resultados, Análises e Concursos',
    description: 'Resultados da Super Sete com análise das colunas sorteadas. Estatísticas e padrões de cada concurso com dados oficiais da Caixa Econômica Federal.',
    keywords: ['resultado super sete', 'super sete resultado', 'super sete colunas', 'análise super sete', 'super sete sorteio'],
  },
};

const VALID_LOTTERIES = Object.keys(LOTTERY_LABELS);

// Pre-render all valid lottery category pages at build time.
// This makes `params` a build-time known value (not runtime-dynamic),
// which satisfies the cacheComponents (PPR) constraint.
export function generateStaticParams() {
  return VALID_LOTTERIES.map((lottery) => ({ lottery }));
}

type Props = {
  params: Promise<{ lottery: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lottery } = await params;
  if (!VALID_LOTTERIES.includes(lottery)) return { title: 'Loteria não encontrada' };

  const label = LOTTERY_LABELS[lottery];
  const info = LOTTERY_DESCRIPTIONS[lottery] ?? {
    title: `${label} — Resultados e Análises`,
    description: `Resultados e análises da ${label} com dados oficiais da Caixa Econômica Federal.`,
    keywords: [`resultado ${label.toLowerCase()}`, `análise ${label.toLowerCase()}`],
  };
  const url = `${BASE_URL}/blog/loteria/${lottery}`;

  return {
    title: info.title,
    description: info.description,
    keywords: info.keywords,
    alternates: { canonical: url },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' } },
    openGraph: {
      title: `${info.title} | Sorteio Bilionário IA`,
      description: info.description,
      url,
      siteName: 'Sorteio Bilionário IA',
      locale: 'pt_BR',
      type: 'website',
      images: [{ url: 'https://sorteiobilionario.com.br/icons/icon-512.png', width: 512, height: 512 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: info.title,
      description: info.description,
    },
  };
}

// ─── Cached post list ────────────────────────────────────────────────────────
async function LotteryPostList({ lottery, page }: { lottery: string; page: number }) {
  'use cache';
  cacheLife('hours');
  cacheTag('blog-posts');

  const label = LOTTERY_LABELS[lottery];
  const { posts, total } = await getPostsByLottery(lottery, page);
  const totalPages = Math.ceil(total / 12);

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">Nenhum artigo publicado ainda para {label}.</p>
        <p className="text-gray-600 text-sm mt-2">Os artigos são gerados automaticamente após cada sorteio.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post: BlogPost) => (
          <article key={post.id} className="flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#f6d27a]/40 transition-colors group">
            {/* Cover — clicável */}
            <Link href={`/${post.slug}`} tabIndex={-1} aria-hidden="true">
              {post.cover_image_url ? (
                <div className="relative aspect-video overflow-hidden">
                  <Image src={post.cover_image_url} alt={post.cover_alt} fill className="object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw" quality={75} />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-purple-900/40 via-[#07060d] to-emerald-900/20 flex items-center justify-center">
                  <span className="text-5xl" role="img" aria-label={label}>🎰</span>
                </div>
              )}
            </Link>
            <div className="flex flex-col flex-1 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-[#f6d27a] uppercase tracking-wider">{label}</span>
                {post.reading_time_min > 0 && (
                  <>
                    <span className="text-gray-700">·</span>
                    <span className="text-xs text-gray-500">{post.reading_time_min} min de leitura</span>
                  </>
                )}
              </div>
              <h2 className="text-white font-semibold text-base leading-snug mb-2 line-clamp-2 flex-1">
                <Link href={`/${post.slug}`} className="hover:text-[#f6d27a] transition-colors">{post.title}</Link>
              </h2>
              <p className="text-gray-400 text-sm line-clamp-3 mb-4">{post.excerpt}</p>
              <div className="flex items-center justify-between gap-2 mt-auto">
                {post.published_at && (
                  <time className="text-xs text-gray-600" dateTime={post.published_at}>
                    {new Date(post.published_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </time>
                )}
                <Link href={`/${post.slug}`} className="text-xs text-[#f6d27a] font-semibold hover:underline shrink-0">
                  Ler artigo →
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Paginação" className="flex justify-center items-center gap-3 mt-12">
          {page > 1 && (
            <Link href={page === 2 ? `/blog/loteria/${lottery}` : `/blog/loteria/${lottery}?page=${page - 1}`} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-white transition-colors">← Anterior</Link>
          )}
          <span className="px-4 py-2 text-sm text-gray-400">Página {page} de {totalPages}</span>
          {page < totalPages && (
            <Link href={`/blog/loteria/${lottery}?page=${page + 1}`} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-white transition-colors">Próxima →</Link>
          )}
        </nav>
      )}
    </>
  );
}

function PostListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="aspect-video bg-white/10" />
          <div className="p-5 space-y-3">
            <div className="h-3 w-20 bg-white/10 rounded" />
            <div className="h-5 w-full bg-white/10 rounded" />
            <div className="h-3 w-1/2 bg-white/10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function PageContent({ paramsPromise, searchParamsPromise }: { paramsPromise: Props['params']; searchParamsPromise: Props['searchParams'] }) {
  const { lottery } = await paramsPromise;
  const { page: pageParam } = await searchParamsPromise;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);

  if (!VALID_LOTTERIES.includes(lottery)) notFound();

  return <LotteryPostList lottery={lottery} page={page} />;
}

export default async function LotteryPage({ params, searchParams }: Props) {
  const { lottery } = await params;
  if (!VALID_LOTTERIES.includes(lottery)) notFound();

  const label = LOTTERY_LABELS[lottery];
  const info = LOTTERY_DESCRIPTIONS[lottery];
  const categoryUrl = `${BASE_URL}/blog/loteria/${lottery}`;

  // CollectionPage schema — clusters tópicos para Google
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: info?.title ?? `${label} — Resultados e Análises`,
    description: info?.description ?? `Análises e resultados da ${label}.`,
    url: categoryUrl,
    inLanguage: 'pt-BR',
    publisher: {
      '@type': 'Organization',
      name: 'Sorteio Bilionário IA',
      url: MAIN_SITE_URL,
      logo: { '@type': 'ImageObject', url: 'https://sorteiobilionario.com.br/icons/icon-512.png' },
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: MAIN_SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: BASE_URL },
      { '@type': 'ListItem', position: 3, name: label, item: categoryUrl },
    ],
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Breadcrumb visual */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <a href={MAIN_SITE_URL} className="hover:text-[#f6d27a] transition-colors">Início</a>
        <span>/</span>
        <Link href="/" className="hover:text-[#f6d27a] transition-colors">Blog</Link>
        <span>/</span>
        <span className="text-[#f6d27a]">{label}</span>
      </nav>

      {/* Header */}
      <header className="text-center mb-12">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-[#f6d27a]/10 border border-[#f6d27a]/20">
          <span className="text-[#f6d27a] text-sm font-medium">🎰 {label}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          {label} — <span className="text-[#f6d27a]">Resultados e Análises</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
          {info?.description ?? `Análises estatísticas e resultados da ${label} com dados oficiais da Caixa Econômica Federal.`}
        </p>
      </header>

      {/* Post list */}
      <Suspense fallback={<PostListSkeleton />}>
        <PageContent paramsPromise={params} searchParamsPromise={searchParams} />
      </Suspense>

      {/* CTA */}
      <section className="mt-16 py-12 border-t border-white/10 text-center">
        <h2 className="text-2xl font-bold mb-3">Gere apostas de {label} com IA</h2>
        <p className="text-gray-400 mb-6 max-w-lg mx-auto">
          Nossa IA analisa o histórico de dezenas da {label} e gera combinações estatisticamente otimizadas.
        </p>
        <a
          href={MAIN_SITE_URL}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f6d27a] text-black font-bold hover:bg-[#f6d27a]/90 transition-colors text-sm"
        >
          Experimentar Grátis →
        </a>
      </section>

      {/* Internal links para outras categorias */}
      <nav aria-label="Outras loterias" className="mt-8 flex flex-wrap gap-3 justify-center">
        {Object.entries(LOTTERY_LABELS)
          .filter(([key]) => key !== lottery)
          .slice(0, 8)
          .map(([key, lbl]) => (
            <Link
              key={key}
              href={`/blog/loteria/${key}`}
              className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-[#f6d27a] hover:border-[#f6d27a]/30 transition-colors"
            >
              {lbl}
            </Link>
          ))}
      </nav>
    </main>
  );
}
