import type { CSSProperties } from "react";
import { pinOf, type PinColor, type PinPos } from "@/lib/style";

/** Posição (em em, no card de 14em) da borda esquerda da imagem da tachinha para prender em cada lugar. */
export const PIN_LEFT: Record<PinPos, number> = { left: 1.1, center: 6.24, right: 11.8 };

/**
 * Tachinha: imagem real (public/img/tachinha.webp, original em imagens/tachinha.png).
 * O centro da base (57% / 59% da imagem) é o ponto de fixação no papel.
 * As outras cores recolorem a mesma imagem por filtro (veja `PIN_COLORS`).
 */
export function Pin({
  tone = "red",
  pos,
  className = "",
  style,
  extra,
}: {
  tone?: PinColor;
  /** Sem isso, a posição vem do `className` (esquerda). Na direita a tachinha é espelhada. */
  pos?: PinPos;
  className?: string;
  style?: CSSProperties;
  /** tachinha colocada por cima de um cartão que não tem a sua (a animação de trocar de cor não a move) */
  extra?: boolean;
}) {
  const recolor = pinOf(tone).filter;
  const flip = pos === "right";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/img/tachinha.webp"
      alt=""
      aria-hidden
      data-tack
      data-extra={extra ? "" : undefined}
      draggable={false}
      className={`pointer-events-none absolute z-20 -mt-[0.85em] -mr-[0.55em] -ml-[0.95em] block w-[3em] select-none ${className}`}
      style={{
        filter: `${recolor}drop-shadow(${flip ? "-" : ""}0.22em 0.4em 0.22em rgba(30, 12, 0, 0.5))`,
        ["--tack-hue" as string]: recolor.trim() || "none", // durante o zoom/arraste só a cor da tachinha fica (a sombra sai); sem isso ela voltava ao vermelho
        ...(pos ? { left: `${PIN_LEFT[pos]}em` } : {}),
        ...(flip ? { transform: "scaleX(-1)" } : {}),
        ...style,
      }}
    />
  );
}
