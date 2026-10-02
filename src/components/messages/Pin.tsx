import type { CSSProperties } from "react";
import { pinOf, type PinColor } from "@/lib/style";

/**
 * Tachinha: imagem real (public/img/tachinha.webp, original em imagens/tachinha.png).
 * O centro da base (57% / 59% da imagem) é o ponto de fixação no papel.
 * As outras cores recolorem a mesma imagem por filtro (veja `PIN_COLORS`).
 */
export function Pin({
  tone = "red",
  className = "",
  style,
}: {
  tone?: PinColor;
  className?: string;
  style?: CSSProperties;
}) {
  const recolor = pinOf(tone).filter;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/img/tachinha.webp"
      alt=""
      aria-hidden
      draggable={false}
      className={`pointer-events-none absolute z-20 -mt-[0.85em] -mr-[0.55em] -ml-[0.95em] block w-[3em] select-none ${className}`}
      style={{
        filter: `${recolor}drop-shadow(0.22em 0.4em 0.22em rgba(30, 12, 0, 0.5))`,
        ...style,
      }}
    />
  );
}
