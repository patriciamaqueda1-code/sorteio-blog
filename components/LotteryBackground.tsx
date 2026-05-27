/**
 * LotteryBackground — Fundo animado com orbs flutuantes + bolas de loteria orbitando.
 * Idêntico ao visual da home do sorteiobilionario.com.br.
 *
 * Server component puro: zero useState/useEffect. Apenas CSS animations.
 * Mobile: orbs e balls ocultados via CSS (GPU-heavy filter:blur).
 * Keyframes definidos em globals.css.
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
      }}
    >
      {/* ── Orbs ambiente flutuantes ──────────────────────────────────────── */}
      <div
        className="lottery-orb"
        style={{
          position: 'absolute', left: '8%', top: '12%',
          width: 520, height: 520, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(246,210,122,0.11), transparent 70%)',
          filter: 'blur(40px)',
          animation: 'float-orb-a 20s ease-in-out infinite',
        }}
      />
      <div
        className="lottery-orb"
        style={{
          position: 'absolute', right: '6%', top: '32%',
          width: 440, height: 440, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,110,240,0.10), transparent 70%)',
          filter: 'blur(36px)',
          animation: 'float-orb-b 25s ease-in-out infinite',
        }}
      />
      <div
        className="lottery-orb"
        style={{
          position: 'absolute', left: '38%', bottom: '6%',
          width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(91,224,166,0.08), transparent 70%)',
          filter: 'blur(32px)',
          animation: 'float-orb-c 18s ease-in-out infinite',
        }}
      />

      {/* ── Cluster de bolas orbitando (canto superior direito) ──────────── */}
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
