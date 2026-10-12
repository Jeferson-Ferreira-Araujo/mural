"use client";

import { baseStyle } from "@/lib/displayShape";
import { coverCredit, REC_KIND_LABEL, type RecKind } from "@/lib/recSearch";
import { Marquee, WidgetFrame } from "./core";

/** Estilos da recomendação: clássico (papel), noite (escuro) e cinema (preto e dourado). */
const SKINS: Record<string, { bg: string; ink: string; sub: string; tag: string; tagInk: string; coverBg: string }> = {
  paper: { bg: "linear-gradient(165deg,#fffaf0,#efe1c2)", ink: "#2f2218", sub: "#6b5440", tag: "#c8452f", tagInk: "#ffffff", coverBg: "#e4d3ae" },
  night: { bg: "linear-gradient(165deg,#1b2433,#0c111a)", ink: "#eef2f7", sub: "rgba(238,242,247,.66)", tag: "#5cc4ff", tagInk: "#08202e", coverBg: "#27324a" },
  cinema: { bg: "linear-gradient(165deg,#17171c,#050507)", ink: "#f6efe0", sub: "rgba(246,239,224,.68)", tag: "#e0a63a", tagInk: "#241a05", coverBg: "#2a2a33" },
};

const ICON: Record<RecKind, string> = {
  book: "M5 4.5A1.5 1.5 0 0 1 6.5 3H18v15H6.5A1.5 1.5 0 0 0 5 19.5v-15ZM5 19.5A1.5 1.5 0 0 0 6.5 21H18v-3",
  movie: "M4 5h16v14H4V5Zm0 4h16M4 15h16M8 5v14M16 5v14",
  series: "M4 7h16v11H4V7Zm4-3 4 3 4-3",
  doc: "M12 3a4 4 0 0 0-4 4v4a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4ZM6 11a6 6 0 0 0 12 0M12 17v4",
};

/**
 * Recomendação (vertical, 12 × 18 em): o tipo (livro, filme, série ou documentário), a capa, o nome e um recado curto do dono.
 * A capa vem de uma fonte pública e gratuita (Open Library, TVmaze) ou é uma foto enviada; as duas fontes públicas levam o crédito embaixo.
 */
export function RecWidget({ style = "paper", kind = "book", title, note, cover, frame }: { style?: string; kind?: string; title?: string; note?: string; cover?: string; frame?: string | null }) {
  const sk = SKINS[baseStyle(style)] ?? SKINS.paper;
  const k: RecKind = kind === "movie" || kind === "series" || kind === "doc" ? kind : "book";
  const name = (title ?? "").trim() || "Sua recomendação";
  const credit = coverCredit(cover);

  return (
    <WidgetFrame frame={frame} label="Recomendação" shape="tall">
      <div className="absolute inset-0 flex flex-col items-center px-[1em] pt-[0.85em] pb-[0.8em]" style={{ background: sk.bg, color: sk.ink }}>
        <span className="mb-[0.55em] inline-flex items-center gap-[0.4em] rounded-full px-[0.9em] py-[0.28em] text-[0.82em] font-extrabold tracking-wider whitespace-nowrap uppercase" style={{ background: sk.tag, color: sk.tagInk }}>
          <svg viewBox="0 0 24 24" className="size-[1.15em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={ICON[k]} />
          </svg>
          {REC_KIND_LABEL[k]}
        </span>

        <div className="flex min-h-0 w-full flex-1 justify-center">
          <div className="relative grid aspect-[2/3] h-full max-w-full place-items-center overflow-hidden rounded-[0.45em]" style={{ background: sk.coverBg, boxShadow: "0 0.2em 0.55em rgba(0,0,0,.4), inset 0 0 0 0.06em rgba(255,255,255,.12)" }}>
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={`Capa de ${name}`} draggable={false} referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />
            ) : (
              <svg viewBox="0 0 24 24" className="size-[40%]" fill="none" stroke={sk.ink} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden opacity=".5">
                <path d={ICON[k]} />
              </svg>
            )}
          </div>
        </div>

        <Marquee text={name} className="mt-[0.6em] text-[1em] leading-tight font-bold" />
        {note && (
          <p className="mt-[0.2em] line-clamp-2 w-full text-center text-[0.8em] leading-snug italic" style={{ color: sk.sub }}>
            “{note}”
          </p>
        )}
        {credit && (
          <p className="mt-[0.35em] text-[0.55em] tracking-wide uppercase" style={{ color: sk.sub }}>
            Capa: {credit}
          </p>
        )}
      </div>
    </WidgetFrame>
  );
}
