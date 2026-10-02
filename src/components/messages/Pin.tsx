import { useId, type CSSProperties } from "react";

/**
 * Tachinha de pino: base larga apoiada no papel, haste e tampa inclinadas para cima/direita,
 * com sombra longa projetada para o lado oposto. O centro da base é o ponto de fixação.
 */
export function Pin({
  color = "#e0160e",
  className = "",
  style,
}: {
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, "");
  const deep = `color-mix(in srgb, ${color} 62%, black)`;
  const dark = `color-mix(in srgb, ${color} 86%, black)`;
  const bright = `color-mix(in srgb, ${color} 82%, white)`;
  const glow = `color-mix(in srgb, ${color} 65%, white)`;
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      className={`pointer-events-none absolute z-20 -mt-[1.7em] -mr-[1.7em] -ml-[0.7em] block size-[4em] overflow-visible ${className}`}
      style={style}
    >
      <defs>
        {/* base: escura no canto superior esquerdo, vermelha viva embaixo à direita */}
        <linearGradient id={`${uid}-base`} x1="0.1" y1="0.05" x2="0.9" y2="0.95">
          <stop offset="0" stopColor={deep} />
          <stop offset="0.45" stopColor={dark} />
          <stop offset="1" stopColor={bright} />
        </linearGradient>
        <linearGradient id={`${uid}-stem`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
        <radialGradient id={`${uid}-cap`} cx="55%" cy="58%" r="62%">
          <stop offset="0" stopColor={glow} />
          <stop offset="0.55" stopColor={color} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <filter id={`${uid}-blur`} x="-40%" y="-60%" width="180%" height="220%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* sombra longa para baixo/esquerda */}
      <ellipse cx="11" cy="52" rx="24" ry="8.5" transform="rotate(-42 11 52)" fill="#1e0c00" opacity=".42" filter={`url(#${uid}-blur)`} />

      {/* base */}
      <circle cx="24" cy="40" r="17" fill={`url(#${uid}-base)`} />
      <circle cx="24" cy="40" r="17" fill="none" stroke={deep} strokeOpacity=".4" strokeWidth=".8" />
      <path d="M12.5 44.5q.8 4.5 4.2 7" stroke="white" strokeOpacity=".9" strokeWidth="1.6" strokeLinecap="round" fill="none" />

      {/* haste */}
      <path d="M17 36 36 26 47 28 33 44Z" fill={`url(#${uid}-stem)`} />
      <ellipse cx="27" cy="38" rx="10" ry="8" fill={dark} opacity=".5" />

      {/* tampa */}
      <circle cx="43.5" cy="19.5" r="13.5" fill={`url(#${uid}-cap)`} />
      <circle cx="43.5" cy="19.5" r="13.5" fill="none" stroke={deep} strokeOpacity=".5" strokeWidth="1" />
      <ellipse cx="47" cy="22" rx="8" ry="7" fill={glow} opacity=".35" />
    </svg>
  );
}
