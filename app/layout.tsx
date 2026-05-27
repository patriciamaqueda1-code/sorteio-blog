import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cacheLife } from 'next/cache';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'optional',      // never blocks render — eliminates CLS
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://sorteiobilionario.com.br'),
  title: {
    default: 'Blog de Loterias | Sorteio Bilionário IA',
    template: '%s | Sorteio Bilionário IA',
  },
  description:
    'Resultados, análises estatísticas e estratégias baseadas em dados reais para Mega-Sena, Lotofácil, Quina e mais loterias brasileiras.',
  keywords: ['loterias brasileiras', 'mega-sena', 'lotofácil', 'resultado', 'análise estatística'],
  authors: [{ name: 'Sorteio Bilionário IA', url: 'https://sorteiobilionario.com.br' }],
  creator: 'Sorteio Bilionário IA',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://sorteiobilionario.com.br',
    siteName: 'Sorteio Bilionário IA',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512 }],
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

// Footer cached for weeks — captures year at cache-time, revalidates automatically
async function Footer() {
  'use cache';
  cacheLife('weeks');
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-gray-500">
        <p>© {year} Sorteio Bilionário IA. Conteúdo gerado por IA com base em dados oficiais da Caixa Econômica Federal.</p>
        <p className="mt-1 text-xs">Jogue com responsabilidade. Este site não garante ganhos.</p>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen antialiased">
        <header className="border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="https://sorteiobilionario.com.br" className="flex items-center gap-2">
              <span className="font-bold text-lg text-[#f6d27a]">🎰 Sorteio Bilionário IA</span>
            </a>
            <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-400">
              <a href="https://sorteiobilionario.com.br" className="hover:text-white transition-colors">App</a>
              <a href="/blog" className="hover:text-white transition-colors">Blog</a>
              <a href="https://sorteiobilionario.com.br/planos" className="hover:text-[#f6d27a] transition-colors">Planos</a>
            </nav>
          </div>
        </header>
        {children}
        <Footer />
      </body>
    </html>
  );
}
