'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h2 className="text-2xl font-bold text-white mb-3">Algo deu errado</h2>
      <p className="text-gray-400 mb-6 max-w-md">
        Ocorreu um erro ao carregar esta página. Por favor, tente novamente.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 rounded-xl bg-[#f6d27a] text-black font-bold hover:bg-[#f6d27a]/90 transition-colors text-sm"
      >
        Tentar novamente
      </button>
    </div>
  );
}
