import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-24 text-center">
      <span className="text-6xl" role="img" aria-label="Página não encontrada">🔍</span>
      <h1 className="text-3xl font-bold mt-6 mb-3">Artigo não encontrado</h1>
      <p className="text-gray-400 mb-8">
        Este artigo pode ter sido removido ou o endereço está incorreto.
      </p>
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f6d27a] text-black font-semibold text-sm hover:bg-[#f6d27a]/90 transition-colors"
      >
        ← Voltar ao Blog
      </Link>
    </main>
  );
}
