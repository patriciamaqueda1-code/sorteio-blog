import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cacheLife } from 'next/cache';
import Link from 'next/link';
import { LotteryBackground } from '@/components/LotteryBackground';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'optional',
  variable: '--font-inter',
});

const BASE_URL = 'https://blog.sorteiobilionario.com.br';
const MAIN_SITE_URL = 'https://sorteiobilionario.com.br';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Blog de Loterias | Sorteio Bilionário IA',
    template: '%s | Sorteio Bilionário IA',
  },
  description:
    'Resultados, análises estatísticas e estratégias para Mega-Sena, Lotofácil, Quina e mais loterias brasileiras. Conteúdo gerado por IA com dados oficiais da Caixa Econômica Federal.',
  keywords: [
    'mega sena resultado', 'lotofácil resultado', 'quina resultado',
    'loterias brasileiras', 'análise estatística loteria',
    'dezenas quentes mega sena', 'resultado caixa econômica',
    'sorteio hoje', 'apostas loteria', 'probabilidade loteria',
  ],
  authors: [{ name: 'Sorteio Bilionário IA', url: BASE_URL }],
  creator: 'Sorteio Bilionário IA',
  publisher: 'Sorteio Bilionário IA',
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: BASE_URL,
    siteName: 'Sorteio Bilionário IA',
    images: [{ url: 'https://sorteiobilionario.com.br/icons/icon-512.png', width: 512, height: 512, alt: 'Sorteio Bilionário IA' }],
  },
  twitter: { card: 'summary_large_image', site: '@SorteioBilionario' },
  alternates: { canonical: BASE_URL },
};

// WebSite + Organization schemas — injetados em toda página
const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Sorteio Bilionário IA',
  url: BASE_URL,
  description: 'Análises estatísticas e resultados das loterias brasileiras com Inteligência Artificial.',
  inLanguage: 'pt-BR',
  publisher: {
    '@type': 'Organization',
    name: 'Sorteio Bilionário IA',
    url: BASE_URL,
    logo: { '@type': 'ImageObject', url: 'https://sorteiobilionario.com.br/icons/icon-512.png', width: 512, height: 512 },
    sameAs: ['https://sorteiobilionario.com.br'],
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/blog?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Sorteio Bilionário IA',
  url: BASE_URL,
  logo: 'https://sorteiobilionario.com.br/icons/icon-512.png',
  description: 'Plataforma de análise estatística e geração de apostas para loterias brasileiras com Inteligência Artificial.',
  sameAs: ['https://sorteiobilionario.com.br'],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'contato@sorteiobilionario.com.br',
    availableLanguage: 'Portuguese',
  },
};

// Footer cached for weeks
async function Footer() {
  'use cache';
  cacheLife('weeks');
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8 text-sm">
          {/* Blog */}
          <div>
            <p className="text-[#f6d27a] font-semibold mb-3 uppercase tracking-wider text-xs">Blog</p>
            <ul className="space-y-2 text-gray-500">
              <li><a href={`${BASE_URL}/blog`} className="hover:text-white transition-colors">Todos os artigos</a></li>
              <li><a href={`${BASE_URL}/blog/loteria/megasena`} className="hover:text-white transition-colors">Mega-Sena</a></li>
              <li><a href={`${BASE_URL}/blog/loteria/lotofacil`} className="hover:text-white transition-colors">Lotofácil</a></li>
              <li><a href={`${BASE_URL}/blog/loteria/quina`} className="hover:text-white transition-colors">Quina</a></li>
              <li><a href={`${BASE_URL}/feed.xml`} className="hover:text-white transition-colors">RSS Feed</a></li>
            </ul>
          </div>
          {/* Plataforma */}
          <div>
            <p className="text-[#f6d27a] font-semibold mb-3 uppercase tracking-wider text-xs">Plataforma</p>
            <ul className="space-y-2 text-gray-500">
              <li><a href={MAIN_SITE_URL} className="hover:text-white transition-colors">App Principal</a></li>
              <li><a href={`${MAIN_SITE_URL}/planos`} className="hover:text-white transition-colors">Planos e preços</a></li>
              <li><a href={`${MAIN_SITE_URL}/mega-sena`} className="hover:text-white transition-colors">Gerar apostas IA</a></li>
            </ul>
          </div>
          {/* Legal */}
          <div>
            <p className="text-[#f6d27a] font-semibold mb-3 uppercase tracking-wider text-xs">Legal</p>
            <ul className="space-y-2 text-gray-500">
              <li><a href={`${MAIN_SITE_URL}/termos`} className="hover:text-white transition-colors">Termos de uso</a></li>
              <li><a href={`${MAIN_SITE_URL}/privacidade`} className="hover:text-white transition-colors">Privacidade & LGPD</a></li>
              <li><a href={`${MAIN_SITE_URL}/transparencia`} className="hover:text-white transition-colors">Transparência</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 text-center text-xs text-gray-600">
          <p>© {year} Sorteio Bilionário IA. Conteúdo gerado por IA com dados oficiais da Caixa Econômica Federal.</p>
          <p className="mt-1">Jogue com responsabilidade. Este site não garante ganhos. Maiores de 18 anos.</p>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <meta name="google-site-verification" content="LRSqzos6rQts-Ua9k2CwJTumoSN4FnmfFLIYJH8ijOQ" />
        <link rel="alternate" type="application/rss+xml" title="Blog de Loterias — Sorteio Bilionário IA" href={`${BASE_URL}/feed.xml`} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_SCHEMA) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }} />
      </head>
      <body className="min-h-screen antialiased">
        {/* Fundo animado: orbs flutuantes + bolas de loteria orbitando */}
        <LotteryBackground />
        {/* z-index: 1 garante que todo conteúdo fique acima do fundo fixo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
        <header className="border-b border-white/10 sticky top-0 z-50 backdrop-blur-md bg-[#07060d]/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href={MAIN_SITE_URL} className="flex items-center gap-2.5 shrink-0 group" style={{ textDecoration: 'none' }}>
              {/* Logo ball — mesma imagem da home sorteiobilionario.com.br */}
              <span style={{
                position: 'relative', display: 'inline-block', width: 36, height: 36, flexShrink: 0,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 32% 28%, #ffffff 0%, #fff5d6 14%, #f6d27a 38%, #c08a2c 72%, #5a3a10 100%)',
                boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.45), inset 0 4px 8px rgba(255,255,255,0.50), 0 4px 14px -4px rgba(192,138,44,0.70), 0 0 0 1px rgba(192,138,44,0.45)',
                overflow: 'hidden',
              }}>
                <img
                  src="https://sorteiobilionario.com.br/icons/sb-ball.png"
                  alt=""
                  aria-hidden="true"
                  width={36}
                  height={36}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              </span>
              {/* Texto — igual ao da home */}
              <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1, gap: 3 }}>
                <span style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontWeight: 700, fontSize: 16, letterSpacing: '0.04em', textTransform: 'uppercase',
                  background: 'linear-gradient(180deg, #fff5d6 0%, #f6d27a 60%, #c08a2c 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>Sorteio Bilionário</span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 8, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', paddingLeft: '0.22em' }}>· IA · Blog ·</span>
              </span>
            </a>
            <nav className="flex items-center gap-4 sm:gap-6 text-sm text-gray-400" aria-label="Navegação principal">
              <a href={MAIN_SITE_URL} className="hover:text-white transition-colors hidden sm:block">App</a>
              <a href={`${BASE_URL}/blog`} className="hover:text-white transition-colors font-medium text-white">Blog</a>
              <a href={`${MAIN_SITE_URL}/planos`} className="hover:text-[#f6d27a] text-[#f6d27a] transition-colors hidden sm:block">Planos</a>
              <a
                href={MAIN_SITE_URL}
                className="px-4 py-1.5 rounded-lg bg-[#f6d27a] text-black text-xs font-bold hover:bg-[#f6d27a]/90 transition-colors"
              >
                Gerar apostas →
              </a>
            </nav>
          </div>
        </header>
        {children}
        <Footer />
        </div>{/* fim z-index wrapper */}
      </body>
    </html>
  );
}
