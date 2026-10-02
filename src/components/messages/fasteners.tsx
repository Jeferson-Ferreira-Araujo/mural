import { useId, type CSSProperties } from "react";

/** Tachinha realista: cabeça esférica brilhante, base, ponta e sombra projetada. */
export function Pin({
  color = "#c43b2f",
  className = "",
  style,
}: {
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, "");
  const light = `color-mix(in srgb, ${color} 55%, white)`;
  const dark = `color-mix(in srgb, ${color} 50%, black)`;
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      className={`pointer-events-none absolute z-20 -mt-[0.5em] -mr-[0.65em] -ml-[0.65em] block size-[2.9em] overflow-visible ${className}`}
      style={style}
    >
      <defs>
        <radialGradient id={`${uid}-h`} cx="36%" cy="30%" r="75%">
          <stop offset="0" stopColor={light} />
          <stop offset="0.45" stopColor={color} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <radialGradient id={`${uid}-b`} cx="50%" cy="40%" r="70%">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <filter id={`${uid}-s`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      {/* sombra projetada no papel + ponta */}
      <ellipse cx="29" cy="33" rx="10" ry="5.5" fill="#1e0c00" opacity=".45" filter={`url(#${uid}-s)`} />
      <path d="M24 28 30 38" stroke="#1e0c00" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" filter={`url(#${uid}-s)`} />
      {/* base achatada */}
      <ellipse cx="24" cy="27" rx="10.5" ry="6" fill={`url(#${uid}-b)`} />
      <ellipse cx="24" cy="25.5" rx="10.5" ry="5.2" fill={dark} opacity=".35" />
      {/* cabeça */}
      <circle cx="24" cy="20" r="11.5" fill={`url(#${uid}-h)`} />
      <circle cx="24" cy="20" r="11.5" fill="none" stroke={dark} strokeOpacity=".35" strokeWidth=".8" />
      {/* reflexos */}
      <ellipse cx="19.5" cy="14.5" rx="4.6" ry="3" fill="white" opacity=".85" transform="rotate(-30 19.5 14.5)" />
      <circle cx="17" cy="17.2" r="1" fill="white" opacity=".5" />
      <path d="M31 27q4-4 3.5-9" stroke={light} strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Fita adesiva translúcida. */
export function Tape({
  className = "",
  rotate = -3,
  tone = "rgba(238, 224, 168, .72)",
}: {
  className?: string;
  rotate?: number;
  tone?: string;
}) {
  return (
    <span
      aria-hidden
      className={`absolute z-20 block h-[1.9em] w-[6em] ${className}`}
      style={{
        transform: `rotate(${rotate}deg)`,
        background: `linear-gradient(90deg, rgba(255,255,255,.25), transparent 30%, rgba(255,255,255,.18) 70%, transparent), ${tone}`,
        boxShadow: "0 0.1em 0.25em rgba(40,20,5,.25)",
        clipPath:
          "polygon(0 8%, 4% 0, 8% 10%, 12% 0, 16% 8%, 20% 0, 100% 0, 100% 100%, 20% 100%, 16% 92%, 12% 100%, 8% 90%, 4% 100%, 0 92%)",
        backdropFilter: "blur(0.5px)",
      }}
    />
  );
}

export function PlayButton({
  playing,
  onClick,
  label,
  className = "",
}: {
  playing: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={playing ? `Pausar ${label}` : `Reproduzir ${label}`}
      aria-pressed={playing}
      className={`grid shrink-0 cursor-pointer place-items-center rounded-full transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${className}`}
    >
      {playing ? (
        <svg viewBox="0 0 24 24" className="size-[45%]" fill="currentColor" aria-hidden>
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-[45%] translate-x-[8%]" fill="currentColor" aria-hidden>
          <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
        </svg>
      )}
    </button>
  );
}
