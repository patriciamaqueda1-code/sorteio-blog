/**
 * LotteryNav — Barra de logos das loterias com hover lift + CTA link para cada categoria.
 * Server component puro: sem useState/useEffect.
 * Hover: translateY + escala via CSS — zero JS client.
 */
import Link from 'next/link';
import { LOTTERY_LABELS } from '@/lib/blog';

const LOTTERY_LOGOS: Record<string, string> = {
  megasena:   '/logos/megasena.png',
  lotofacil:  '/logos/lotofacil.png',
  quina:      '/logos/quina.png',
  lotomania:  '/logos/lotomania.png',
  duplasena:  '/logos/duplasena.png',
  timemania:  '/logos/timemania.png',
  diadesorte: '/logos/diadesorte.png',
  supersete:  '/logos/supersete.png',
  loteca:     '/logos/loteca.png',
  federal:    '/logos/federal.png',
  // milionaria — sem logo, usa emoji como fallback
};

const LOTTERY_EMOJI: Record<string, string> = {
  milionaria: '💎',
};

type Props = {
  activeLottery?: string;
};

export function LotteryNav({ activeLottery }: Props) {
  const entries = Object.entries(LOTTERY_LABELS);

  return (
    <nav
      aria-label="Navegar por loteria"
      className="lottery-nav"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: 'center',
        marginBottom: '28px',
      }}
    >
      {entries.map(([key, label]) => {
        const isActive = key === activeLottery;
        const logoSrc = LOTTERY_LOGOS[key];
        const emoji = LOTTERY_EMOJI[key];

        return (
          <Link
            key={key}
            href={`/blog/loteria/${key}`}
            title={`Ver todos os artigos de ${label}`}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 10px',
              borderRadius: '12px',
              border: isActive
                ? '1.5px solid rgba(246,210,122,0.7)'
                : '1.5px solid rgba(255,255,255,0.08)',
              background: isActive
                ? 'rgba(246,210,122,0.10)'
                : 'rgba(255,255,255,0.03)',
              textDecoration: 'none',
              transition: 'transform 200ms ease, border-color 200ms ease, background 200ms ease, box-shadow 200ms ease',
              cursor: 'pointer',
              // hover via CSS class — ver globals.css
            }}
            className="lottery-nav-item"
          >
            {/* Logo ou emoji fallback */}
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={label}
                  width={44}
                  height={44}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: 28, lineHeight: 1 }}>{emoji ?? '🎰'}</span>
              )}
            </span>
            {/* Label */}
            <span
              style={{
                fontSize: 9,
                fontFamily: 'var(--font-jetbrains, "JetBrains Mono", monospace)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: isActive ? 'var(--gold-100, #f6d27a)' : 'rgba(255,255,255,0.45)',
                textAlign: 'center',
                maxWidth: 64,
                lineHeight: 1.3,
                transition: 'color 200ms ease',
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}

      {/* CSS hover via style tag — server-safe sem client component */}
      <style>{`
        .lottery-nav-item:hover {
          transform: translateY(-4px) scale(1.06);
          border-color: rgba(246,210,122,0.50) !important;
          background: rgba(246,210,122,0.07) !important;
          box-shadow: 0 8px 24px -8px rgba(246,210,122,0.25);
        }
        .lottery-nav-item:hover span:last-child {
          color: rgba(246,210,122,0.85) !important;
        }
        @media (max-width: 480px) {
          .lottery-nav { gap: 6px !important; }
          .lottery-nav-item { padding: 6px 7px !important; }
          .lottery-nav-item span:first-child { width: 36px !important; height: 36px !important; }
          .lottery-nav-item span:first-child img { width: 36px !important; height: 36px !important; }
        }
      `}</style>
    </nav>
  );
}
