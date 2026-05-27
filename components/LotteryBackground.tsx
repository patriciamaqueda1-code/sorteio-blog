/**
 * LotteryBackground — Fundo animado: orbs flutuantes + bolas de loteria orbitando.
 *
 * Performance: SEM filter:blur — os orbs usam radial-gradient multi-stop que
 * cria o mesmo efeito difuso visualmente, mas com custo GPU zero (nenhuma
 * textura extra alocada, nenhum layer de compositing adicional).
 *
 * Bolas: will-change:transform → layer GPU própria, animação 60fps sem repaint.
 * Mobile (≤768px): orbs E bolas ocultados via CSS — zero custo em mobile.
 * Server component puro: zero useState/useEffect. Keyframes em globals.css.
 */

export function LotteryBackground() {
  const BALLS = [
    { n: 17, anim: 'orbit-a', dur: 6.0, bg: 'radial-gradient(circle at 33% 28%,#fffae0,#f6d27a 42%,#c08a2c 100%)', color: '#2a1a00', glow: '0 0 18px rgba(246,210,122,0.9)' },
    { n: 4,  anim: 'orbit-b', dur: 7.2, bg: 'radial-gradient(circle at 33% 28%,#ece5ff,#c4a8ff 42%,#5b3fc4 100%)', color: '#fff',     glow: '0 0 18px rgba(139,110,240,0.9)' },
    { n: 31, anim: 'orbit-c', dur: 5.6, bg: 'radial-gradient(circle at 33% 28%,#d0fff0,#5be0a6 42%,#1d8a5a 100%)', color: '#fff',     glow: '0 0 18px rgba(91,224,166,0.9)'  },
    { n: 23, anim: 'orbit-d', dur: 8.1, bg: 'radial-gradient(circle at 33% 28%,#fffae0,#f6d27a 42%,#c08a2c 100%)', color: '#2a1a00', glow: '0 0 18px rgba(246,210,122,0.9)' },
    { n: 42, anim: 'orbit-e', dur: 6.8, bg: 'radial-gradient(circle at 33% 28%,#ece5ff,#c4a8ff 42%,#5b3fc4 100%)', color: '#fff',     glow: '0 0 18px rgba(139,110,240,0.9)' },
    { n: 58, anim: 'orbit-f', dur: 7.4, bg: 'radial-gradient(circle at 33% 28%,#d0fff0,#5be0a6 42%,#1d8a5a 100%)', color: '#fff',     glow: '0 0 18px rgba(91,224,166,0.9)'  },
  ] as const;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        // contain:strict isola completamente este elemento do layout principal —
        // nenhum repaint externo afeta o fundo, e vice-versa.
        contain: 'strict',
      }}
    >
      {/* ── Orbs ambiente (SEM filter:blur — multi-stop gradient = mesmo efeito, custo zero) ── */}
      <div
        className="lottery-orb"
        style={{
          position: 'absolute', left: '8%', top: '12%',
          width: 600, height: 600, borderRadius: '50%',
          // Multi-stop: centro mais visível, fade suave até transparente
          background: 'radial-gradient(circle, rgba(246,210,122,0.13) 0%, rgba(246,210,122,0.07) 38%, rgba(246,210,122,0.02) 60%, transparent 75%)',
          animation: 'float-orb-a 20s ease-in-out infinite',
        }}
      />
      <div
        className="lottery-orb"
        style={{
          position: 'absolute', right: '6%', top: '32%',
          width: 520, height: 520, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,110,240,0.12) 0%, rgba(139,110,240,0.06) 38%, rgba(139,110,240,0.02) 60%, transparent 75%)',
          animation: 'float-orb-b 25s ease-in-out infinite',
        }}
      />
      <div
        className="lottery-orb"
        style={{
          position: 'absolute', left: '38%', bottom: '6%',
          width: 460, height: 460, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(91,224,166,0.10) 0%, rgba(91,224,166,0.05) 38%, rgba(91,224,166,0.01) 60%, transparent 75%)',
          animation: 'float-orb-c 18s ease-in-out infinite',
        }}
      />

      {/* ── Cluster de bolas orbitando — canto superior direito ────────────── */}
      <div
        className="lottery-balls-cluster"
        style={{ position: 'absolute', right: '8%', top: '22%', width: 0, height: 0 }}
      >
        {BALLS.map((b) => (
          <div
            key={b.n}
            className="lottery-ball-item"
            style={{
              position: 'absolute',
              width: 46, height: 46,
              borderRadius: '50%',
              background: b.bg,
              color: b.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 13,
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              boxShadow: b.glow,
              opacity: 0.62,
              animation: `${b.anim} ${b.dur}s linear infinite`,
              // will-change promove cada bola a layer GPU própria —
              // animação transform pura, zero layout reflow, zero repaint
              willChange: 'transform',
            }}
          >
            {b.n}
          </div>
        ))}
      </div>
    </div>
  );
}
