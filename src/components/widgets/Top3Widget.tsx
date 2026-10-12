"use client";

import { baseStyle, shapeOfStyle } from "@/lib/displayShape";
import { WidgetFrame } from "./core";

/** Estilos do Top 3: pódio (papel claro), noite (escuro) e neon (roxo e rosa). */
const SKINS: Record<string, { bg: string; ink: string; sub: string; row: string; edge: string; title: string; glow: string }> = {
  podium: { bg: "linear-gradient(155deg,#fffaf0,#f1e4c6)", ink: "#2f2218", sub: "#6b5440", row: "rgba(255,255,255,.72)", edge: "rgba(120,80,20,.22)", title: "#b5471f", glow: "none" },
  night: { bg: "linear-gradient(150deg,#1b2433,#0c111a)", ink: "#eef2f7", sub: "rgba(238,242,247,.62)", row: "rgba(255,255,255,.07)", edge: "rgba(92,196,255,.28)", title: "#5cc4ff", glow: "none" },
  neon: { bg: "linear-gradient(150deg,#2a1055,#0c0624)", ink: "#fbeaff", sub: "rgba(251,234,255,.66)", row: "rgba(255,255,255,.08)", edge: "rgba(255,106,213,.4)", title: "#ff6ad5", glow: "0 0 0.45em rgba(255,106,213,.6)" },
};

const MEDALS = [
  { bg: "linear-gradient(145deg,#ffe28a,#e0a63a)", ink: "#4a3205" },
  { bg: "linear-gradient(145deg,#f1f4f8,#aeb7c2)", ink: "#2d3540" },
  { bg: "linear-gradient(145deg,#eab98a,#b76e35)", ink: "#3e2008" },
];

/**
 * Top 3: o tema que a pessoa digitou (ex.: "Minhas comidas favoritas") e os três itens, de 1º a 3º lugar.
 * Textos parados, em até duas linhas. Três estilos, em formato retangular ou quadrado.
 */
export function Top3Widget({ style = "podium", title, items, frame }: { style?: string; title?: string; items?: string[]; frame?: string | null }) {
  const shape = shapeOfStyle(style);
  const square = shape === "square";
  const sk = SKINS[baseStyle(style)] ?? SKINS.podium;
  const theme = (title ?? "").trim() || "Meu top 3";
  const list = [0, 1, 2].map((i) => (items?.[i] ?? "").trim());

  return (
    <WidgetFrame frame={frame} label="Top 3" shape={shape}>
      <div className={`absolute inset-0 flex flex-col ${square ? "px-[0.9em] pt-[0.85em] pb-[0.9em]" : "px-[1.2em] pt-[0.8em] pb-[0.9em]"}`} style={{ background: sk.bg, color: sk.ink }}>
        <div className="flex items-center justify-center gap-[0.5em]">
          <svg viewBox="0 0 24 24" className="size-[1.25em] shrink-0" fill="none" stroke={sk.title} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8.5 20h7" />
          </svg>
          <p className={`line-clamp-2 min-w-0 flex-1 text-center leading-tight font-extrabold [overflow-wrap:anywhere] ${square ? "text-[1.05em]" : "text-[1.3em]"}`} style={{ color: sk.title, textShadow: sk.glow }} title={theme}>
            {theme}
          </p>
        </div>
        <ol className={`mt-[0.55em] grid min-h-0 flex-1 grid-rows-3 ${square ? "gap-[0.4em]" : "gap-[0.45em]"}`}>
          {list.map((text, i) => (
            <li key={i} className="flex min-h-0 items-center gap-[0.65em] rounded-[0.7em] px-[0.55em]" style={{ background: sk.row, boxShadow: `inset 0 0 0 0.06em ${sk.edge}` }}>
              <span aria-label={`${i + 1}º lugar`} className={`grid shrink-0 place-items-center rounded-full font-black ${square ? "size-[1.7em] text-[0.95em]" : "size-[1.9em] text-[1.05em]"}`} style={{ background: MEDALS[i].bg, color: MEDALS[i].ink, boxShadow: "0 0.12em 0.25em rgba(0,0,0,.3)" }}>
                {i + 1}
              </span>
              <span className={`line-clamp-2 min-w-0 flex-1 leading-tight font-bold [overflow-wrap:anywhere] ${square ? "text-[0.92em]" : "text-[1.08em]"}`} style={{ color: text ? sk.ink : sk.sub }}>
                {text || "—"}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </WidgetFrame>
  );
}
