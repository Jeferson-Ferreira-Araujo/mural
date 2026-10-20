"use client";

import { baseStyle, shapeOfStyle } from "@/lib/displayShape";
import { WidgetFrame } from "./core";
import { useTranslations } from "next-intl";
import { useWT } from "./wt";

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

/** Faíscas decorativas ao lado do tema: três riscos que saem do título, iguais nos dois lados (espelhados). */
function Spark({ side, color, size }: { side: "left" | "right"; color: string; size: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="shrink-0" style={{ width: `${size}em`, height: `${size}em`, transform: side === "left" ? "scaleX(-1)" : undefined }} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round">
      <path d="M6 8 L12 4 M8 13 L16 12 M7 18 L13 21" />
    </svg>
  );
}

/**
 * Top 3: o tema que a pessoa digitou (ex.: "Minhas comidas favoritas") e os três itens, de 1º a 3º lugar.
 * Textos parados, em até duas linhas. Três estilos, em formato retangular ou quadrado; o 1º lugar ganha destaque dourado.
 */
export function Top3Widget({ style = "podium", title, items, frame }: { style?: string; title?: string; items?: string[]; frame?: string | null }) {
  const tx = useTranslations("components.widgets.Top3Widget");
  const wt = useWT();
  const shape = shapeOfStyle(style);
  const square = shape === "square";
  const sk = SKINS[baseStyle(style)] ?? SKINS.podium;
  const theme = (title ?? "").trim() || "Meu top 3";
  const list = [0, 1, 2].map((i) => (items?.[i] ?? "").trim());

  const gold = "#f0b323";

  return (
    <WidgetFrame frame={frame} label={tx("top3")} shape={shape}>
      <div className={`absolute inset-0 flex flex-col ${square ? "px-[0.8em] pt-[0.8em] pb-[0.85em]" : "px-[1.1em] pt-[0.75em] pb-[0.85em]"}`} style={{ background: sk.bg, color: sk.ink }}>
        {/* cabeçalho: o tema em destaque, com um grifo embaixo e faíscas dos dois lados */}
        <div className="flex items-center justify-center gap-[0.4em]">
          <Spark side="left" color={gold} size={square ? 1.2 : 1.5} />
          <div className="min-w-0 flex-1 text-center">
            <p className={`line-clamp-2 leading-[1.05] font-black [overflow-wrap:anywhere] ${square ? "text-[1.2em]" : "text-[1.55em]"}`} style={{ color: sk.title, textShadow: sk.glow }} title={theme}>
              {theme}
            </p>
            <svg aria-hidden viewBox="0 0 100 8" preserveAspectRatio="none" className="mx-auto mt-[0.1em] block h-[0.35em] w-[55%]">
              <path d="M2 5 Q 50 0 98 3" fill="none" stroke={gold} strokeWidth="3.4" strokeLinecap="round" />
            </svg>
          </div>
          <Spark side="right" color={gold} size={square ? 1.2 : 1.5} />
        </div>
        <ol className={`mt-[0.5em] grid min-h-0 flex-1 grid-rows-3 ${square ? "gap-[0.4em]" : "gap-[0.45em]"}`}>
          {list.map((text, i) => (
            <li
              key={i}
              className="relative flex min-h-0 items-center gap-[0.7em] rounded-[1em] py-[0.38em] pr-[0.6em] pl-[0.38em]"
              style={{ background: i === 0 ? `linear-gradient(95deg, rgba(255,222,120,.55), ${sk.row} 70%)` : sk.row, boxShadow: `inset 0 0 0 0.07em ${i === 0 ? "rgba(240,179,35,.7)" : sk.edge}, 0 0.1em 0.3em rgba(0,0,0,.12)` }}
            >
              <span className="relative aspect-square shrink-0 self-stretch">
                {i === 0 && (
                  <svg aria-hidden viewBox="0 0 24 14" className="absolute -top-[0.62em] left-1/2 z-10 w-[1.1em] -translate-x-1/2" fill={gold} stroke="#b97a0a" strokeWidth="1" strokeLinejoin="round">
                    <path d="M2 12 L1 3 L7 7 L12 1 L17 7 L23 3 L22 12 Z" />
                  </svg>
                )}
                {/* o número tem o tamanho do próprio círculo (cqh) e desce um pouco: os algarismos ficam acima do centro da linha de texto */}
                <span aria-label={wt.place(i + 1)} className="block size-full rounded-full [container-type:size]" style={{ background: MEDALS[i].bg, color: MEDALS[i].ink, boxShadow: "inset 0 0 0 0.09em rgba(255,255,255,.6), 0 0.12em 0.25em rgba(0,0,0,.28)" }}>
                  <span className="grid size-full place-items-center font-black tabular-nums" style={{ fontSize: "50cqh", lineHeight: 1, paddingTop: "0.06em" }}>
                    {i + 1}
                  </span>
                </span>
              </span>
              <span className={`line-clamp-2 min-w-0 flex-1 leading-tight font-extrabold [overflow-wrap:anywhere] ${square ? "text-[0.98em]" : "text-[1.2em]"}`} style={{ color: text ? sk.ink : sk.sub }}>
                {text || "—"}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </WidgetFrame>
  );
}
