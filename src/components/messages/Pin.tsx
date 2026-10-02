import type { CSSProperties } from "react";

/**
 * Tachinha: imagem real (public/img/tachinha.webp, original em imagens/tachinha.png).
 * O centro da base (57% / 59% da imagem) é o ponto de fixação no papel.
 * `tone="blue"` recolore a mesma imagem via hue-rotate.
 */
export function Pin({
  tone = "red",
  className = "",
  style,
}: {
  tone?: "red" | "blue";
  className?: string;
  style?: CSSProperties;
}) {
  const recolor = tone === "blue" ? "hue-rotate(215deg) saturate(1.1) " : "";
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
