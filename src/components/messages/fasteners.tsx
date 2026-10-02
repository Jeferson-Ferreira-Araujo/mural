import type { CSSProperties } from "react";

/** Alfinete (tachinha) visto de cima, com brilho e sombra no papel. */
export function Pin({
  color = "#c43b2f",
  className = "",
  style,
}: {
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={`absolute z-20 block size-[1.45em] rounded-full ${className}`}
      style={{
        background: `radial-gradient(circle at 35% 30%, #fff9 0 12%, transparent 30%), radial-gradient(circle at 40% 35%, ${color}, color-mix(in srgb, ${color} 55%, #000) 95%)`,
        boxShadow:
          "0.18em 0.32em 0.28em rgba(30,12,0,.5), inset -0.1em -0.12em 0.18em rgba(0,0,0,.35)",
        ...style,
      }}
    />
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
