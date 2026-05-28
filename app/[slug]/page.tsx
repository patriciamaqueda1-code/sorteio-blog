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
import { LotteryNav } from '@/components/LotteryNav';
import type { BlogPost } from '@/types/blog';

const BASE_URL = 'https://blog.sorteiobilionario.com.br';
const MAIN_SITE_URL = 'https://sorteiobilionario.com.br';

// ─── FAQ estático por loteria — injetado como FAQPage schema ─────────────────
const LOTTERY_FAQS: Record<string, Array<{ question: string; answer: string }>> = {
  megasena: [
    { question: 'Quantos números preciso acertar na Mega-Sena para ganhar?', answer: 'Na Mega-Sena você ganha acertando 4 dezenas (Quadra), 5 dezenas (Quina) ou 6 dezenas (Sena). O prêmio principal — a Sena — exige acertar as 6 dezenas sorteadas pela Caixa Econômica Federal.' },
    { question: 'Quando ocorrem os sorteios da Mega-Sena?', answer: 'Os sorteios da Mega-Sena ocorrem às terças, quintas e sábados, às 20h (horário de Brasília), no Espaço da Sorte em São Paulo.' },
    { question: 'O que acontece quando a Mega-Sena acumula?', answer: 'Quando nenhum apostador acerta as 6 dezenas, o prêmio principal acumula para o próximo concurso, podendo atingir centenas de milhões de reais como nas edições da Mega da Virada.' },
    { question: 'Como a análise estatística ajuda nas apostas da Mega-Sena?', answer: 'A análise de dezenas quentes (mais frequentes) e frias (em atraso) pode embasar apostas mais informadas. Ferramentas de IA como o Sorteio Bilionário IA cruzam esses dados para sugerir combinações estatisticamente otimizadas.' },
  ],
  lotofacil: [
    { question: 'Como funciona a Lotofácil?', answer: 'Na Lotofácil você escolhe de 15 a 20 números de 1 a 25. São sorteadas 15 dezenas e você ganha acertando de 11 a 15 números. O prêmio máximo é para quem acerta as 15 dezenas.' },
    { question: 'Quando ocorrem os sorteios da Lotofácil?', answer: 'A Lotofácil sorteios de segunda a sábado, às 20h (horário de Brasília), sendo a loteria com maior frequência de concursos da Caixa Econômica Federal.' },
    { question: 'Por que a Lotofácil é mais fácil de ganhar que a Mega-Sena?', answer: 'A probabilidade de acertar 15 dezenas na Lotofácil é de aproximadamente 1 em 3,3 milhões com o jogo mínimo — bem menor que a Mega-Sena (1 em 50 milhões). Além disso, há premiação a partir de 11 acertos.' },
    { question: 'Quais são as dezenas mais frequentes na Lotofácil?', answer: 'As dezenas mais frequentes variam conforme o histórico de sorteios. A análise dos últimos 90 concursos pelo Sorteio Bilionário IA indica quais números aparecem com maior regularidade, auxiliando na escolha de apostas.' },
  ],
  quina: [
    { question: 'Como funciona a Quina?', answer: 'Na Quina você escolhe de 5 a 15 números de 1 a 80. São sorteadas 5 dezenas. Há premiação para 2, 3, 4 ou 5 acertos, sendo 5 acertos o prêmio máximo (Quina).' },
    { question: 'Quando ocorrem os sorteios da Quina?', answer: 'Os sorteios da Quina acontecem de segunda a sábado, às 20h (horário de Brasília).' },
    { question: 'A Quina pode acumular?', answer: 'Sim. Se nenhum apostador acertar a Quina completa (5 números), o prêmio principal acumula para o próximo concurso. As faixas menores são distribuídas normalmente.' },
    { question: 'Qual a probabilidade de ganhar na Quina?', answer: 'Com o jogo simples de 5 números, a probabilidade de acertar a Quina é de 1 em 24 milhões. Apostas com mais dezenas aumentam as chances e o custo proporcionalmente.' },
  ],
  lotomania: [
    { question: 'Como funciona a Lotomania?', answer: 'Na Lotomania você marca exatamente 50 números de 1 a 100. São sorteados 20 números. Você ganha acertando de 15 a 20 dezenas — e também há prêmio para quem não acertar nenhuma (acerto zero).' },
    { question: 'O que é o acerto zero na Lotomania?', answer: 'Se nenhum dos seus 50 números coincidir com os 20 sorteados, você ganha o prêmio de acerto zero — uma premiação exclusiva da Lotomania.' },
    { question: 'Quando ocorrem os sorteios da Lotomania?', answer: 'Os sorteios da Lotomania acontecem às segundas e sextas-feiras, às 20h (horário de Brasília).' },
    { question: 'Como a Lotomania pode acumular?', answer: 'Se nenhum apostador acertar as 20 dezenas, o prêmio principal acumula para o próximo concurso.' },
  ],
  duplasena: [
    { question: 'O que é a Dupla Sena?', answer: 'A Dupla Sena realiza dois sorteios por concurso. Você escolhe de 6 a 15 números de 1 a 50 e concorre nos dois sorteios. Há premiação para 3, 4, 5 ou 6 acertos em cada sorteio.' },
    { question: 'Quando ocorrem os sorteios da Dupla Sena?', answer: 'Os sorteios da Dupla Sena acontecem às terças, quintas e sábados, às 20h (horário de Brasília).' },
    { question: 'Como funcionam os dois sorteios da Dupla Sena?', answer: 'No primeiro sorteio são determinados os ganhadores do prêmio principal. No segundo sorteio há mais uma chance de ganhar nas mesmas faixas, com os mesmos números marcados — dobrando as oportunidades.' },
    { question: 'A Dupla Sena pode acumular?', answer: 'Sim. Se não houver ganhadores do prêmio principal nos dois sorteios do concurso, o valor acumula para o próximo.' },
  ],
  milionaria: [
    { question: 'Como funciona a +Milionária?', answer: 'Na +Milionária você escolhe de 6 a 12 números de 1 a 50 e de 2 trevos de 1 a 6. O prêmio máximo exige acertar os 6 números sorteados e os 2 trevos.' },
    { question: 'O que são os trevos da +Milionária?', answer: 'Os trevos são números adicionais (de 1 a 6) que integram o sorteio. Acertar mais trevos além dos números principais aumenta o prêmio — criando múltiplas faixas de premiação.' },
    { question: 'Quando ocorrem os sorteios da +Milionária?', answer: 'Os sorteios da +Milionária acontecem às quartas e sábados, às 20h (horário de Brasília).' },
    { question: 'Por que a +Milionária paga prêmios tão altos?', answer: 'A combinação de dezenas + trevos cria uma probabilidade muito baixa de acerto total, permitindo que os prêmios acumulem e atinjam valores milionários mais rapidamente que outras loterias.' },
  ],
  timemania: [
    { question: 'Como funciona a Timemania?', answer: 'Na Timemania você escolhe 10 números de 1 a 80 e um Time do Coração (clube de futebol). São sorteados 7 números e um time. Há premiação para 3 a 7 acertos.' },
    { question: 'O que é o Time do Coração na Timemania?', answer: 'É um clube de futebol inscrito associado ao seu jogo. Se o time sorteado coincidir com o seu, você ganha um prêmio adicional — mesmo sem acertar nenhum número.' },
    { question: 'Quando ocorrem os sorteios da Timemania?', answer: 'Os sorteios da Timemania acontecem às terças, quintas e sábados, às 20h (horário de Brasília).' },
    { question: 'Como os clubes de futebol se beneficiam da Timemania?', answer: 'Os clubes inscritos recebem percentual da arrecadação de cada concurso, contribuindo para o desenvolvimento do futebol brasileiro.' },
  ],
  diadesorte: [
    { question: 'Como funciona o Dia de Sorte?', answer: 'No Dia de Sorte você escolhe de 7 a 15 números de 1 a 31 e um Mês da Sorte (de janeiro a dezembro). São sorteados 7 números e um mês. Há premiação para 4, 5, 6 ou 7 acertos.' },
    { question: 'O que é o Mês da Sorte?', answer: 'É um mês do ano sorteado junto com os números. Acertar o Mês da Sorte além dos números principais amplia os prêmios e aumenta as chances de ganhar.' },
    { question: 'Quando ocorrem os sorteios do Dia de Sorte?', answer: 'Os sorteios do Dia de Sorte acontecem às quartas e sábados, às 20h (horário de Brasília).' },
    { question: 'O Dia de Sorte pode acumular?', answer: 'Sim. Se não houver ganhadores do prêmio principal (7 acertos), o valor acumula para o próximo concurso.' },
  ],
  supersete: [
    { question: 'Como funciona a Super Sete?', answer: 'Na Super Sete você escolhe um número de 0 a 9 em cada uma das 7 colunas. São sorteados 7 números (um por coluna). Você ganha acertando 3, 4, 5, 6 ou 7 colunas.' },
    { question: 'Por que a Super Sete é diferente das outras loterias?', answer: 'Usa colunas com dígitos de 0 a 9 — diferente das loterias de dezenas. Cada coluna é independente, criando uma mecânica única de apostas na Caixa Econômica Federal.' },
    { question: 'Quando ocorrem os sorteios da Super Sete?', answer: 'Os sorteios da Super Sete acontecem às segundas, quartas e sextas-feiras, às 15h (horário de Brasília).' },
    { question: 'A Super Sete pode acumular?', answer: 'Sim. Se não houver ganhadores do prêmio principal (7 colunas certas), o valor acumula para o próximo concurso.' },
  ],
};

const DEFAULT_FAQS = [
  { question: 'Como funcionam as loterias da Caixa Econômica Federal?', answer: 'As loterias da Caixa são jogos de azar regulamentados pelo governo federal brasileiro. Os prêmios são distribuídos aos apostadores que acertam as dezenas ou números sorteados em cada modalidade.' },
  { question: 'Onde posso fazer minha aposta nas loterias?', answer: 'Você pode apostar em casas lotéricas credenciadas, pelo site oficial da Caixa Econômica Federal ou pelo aplicativo Loterias Online. A aposta mínima varia por modalidade.' },
  { question: 'Como a análise estatística pode ajudar nas apostas?', answer: 'A análise identifica dezenas quentes (alta frequência) e frias (em atraso) no histórico de sorteios. Embora a loteria seja aleatória, dados estatísticos podem embasar escolhas mais informadas.' },
];

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

  const canonicalUrl = `${BASE_URL}/${post.slug}`;
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
    authors: [{ name: 'Sorteio Bilionário IA', url: MAIN_SITE_URL }],
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
        : [{ url: 'https://sorteiobilionario.com.br/icons/icon-512.png', width: 512, height: 512 }],
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
            href={`/${r.slug}`}
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

  const canonicalUrl = `${BASE_URL}/${post.slug}`;
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
    author: { '@type': 'Organization', name: 'Sorteio Bilionário IA', url: MAIN_SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Sorteio Bilionário IA',
      url: MAIN_SITE_URL,
      logo: { '@type': 'ImageObject', url: 'https://sorteiobilionario.com.br/icons/icon-512.png', width: 512, height: 512 },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    image: post.cover_image_url
      ? [{ '@type': 'ImageObject', url: post.cover_image_url, caption: post.cover_alt, width: 1360, height: 768 }]
      : [{ '@type': 'ImageObject', url: 'https://sorteiobilionario.com.br/icons/icon-512.png' }],
    ...(post.video_url && {
      video: {
        '@type': 'VideoObject',
        name: post.title,
        description: post.meta_description,
        contentUrl: post.video_url,
        thumbnailUrl: post.cover_image_url ?? 'https://sorteiobilionario.com.br/icons/icon-512.png',
        uploadDate: post.published_at,
      },
    }),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: MAIN_SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: BASE_URL },
      ...(lotteryLabel ? [{ '@type': 'ListItem', position: 3, name: lotteryLabel, item: `${BASE_URL}/blog/${post.lottery}` }] : []),
      { '@type': 'ListItem', position: lotteryLabel ? 4 : 3, name: post.title, item: canonicalUrl },
    ],
  };

  // FAQPage schema — featured snippets no Google
  const faqs = post.lottery ? (LOTTERY_FAQS[post.lottery] ?? DEFAULT_FAQS) : DEFAULT_FAQS;
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };

  return (
    <>
      {/* Breadcrumb visual */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
        <a href={MAIN_SITE_URL} className="hover:text-[#f6d27a] transition-colors">Início</a>
        <span>/</span>
        <Link href="/" className="hover:text-[#f6d27a] transition-colors">Blog</Link>
        {lotteryLabel && post.lottery && (
          <>
            <span>/</span>
            <Link href={`/blog/loteria/${post.lottery}`} className="hover:text-[#f6d27a] transition-colors">{lotteryLabel}</Link>
          </>
        )}
      </nav>

      {/* Navegação por loteria — logos clicáveis com hover lift */}
      <LotteryNav activeLottery={post.lottery ?? undefined} />

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* CTA */}
      <div className="mt-10 p-6 rounded-2xl bg-[#f6d27a]/10 border border-[#f6d27a]/20 text-center">
        <p className="font-bold text-lg mb-2">🎯 Gere apostas com IA baseada em estatísticas reais</p>
        <p className="text-gray-400 text-sm mb-4 max-w-md mx-auto">
          Analise dezenas quentes, frias e padrões históricos. Nossa IA gera combinações otimizadas para Mega-Sena, Lotofácil e mais.
        </p>
        <a
          href={MAIN_SITE_URL}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f6d27a] text-black font-bold text-sm hover:bg-[#f6d27a]/90 transition-colors"
          rel="noopener"
        >
          Acessar Sorteio Bilionário IA →
        </a>
      </div>

      {/* FAQ — featured snippets */}
      <section className="mt-10 border-t border-white/10 pt-8" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-xl font-bold mb-6">Perguntas Frequentes</h2>
        <div className="space-y-4">
          {faqs.map(({ question, answer }, i) => (
            <details key={i} className="group rounded-xl bg-white/5 border border-white/10 hover:border-[#f6d27a]/20 transition-colors">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none p-4 text-sm font-semibold text-white select-none">
                <span>{question}</span>
                <span className="shrink-0 text-gray-500 group-open:rotate-180 transition-transform duration-200 text-lg leading-none">▾</span>
              </summary>
              <p className="px-4 pb-4 pt-1 text-sm text-gray-400 leading-relaxed">{answer}</p>
            </details>
          ))}
        </div>
      </section>

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
