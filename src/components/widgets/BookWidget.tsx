"use client";

import { baseStyle } from "@/lib/displayShape";
import { WidgetFrame } from "./core";

export type BookView = "count" | "bar" | "both";

/** Estilos do display de leitura: papel (claro), noite (escuro) e estante (madeira). */
const SKINS: Record<string, { bg: string; ink: string; sub: string; track: string; fill: string; coverBg: string; edge: string }> = {
  paper: { bg: "linear-gradient(165deg,#fffaf0,#efe1c2)", ink: "#2f2218", sub: "#6b5440", track: "rgba(47,34,24,.16)", fill: "#c8452f", coverBg: "#e4d3ae", edge: "rgba(47,34,24,.2)" },
  night: { bg: "linear-gradient(165deg,#1b2433,#0c111a)", ink: "#eef2f7", sub: "rgba(238,242,247,.62)", track: "rgba(255,255,255,.14)", fill: "#5cc4ff", coverBg: "#27324a", edge: "rgba(255,255,255,.16)" },
  wood: { bg: "linear-gradient(165deg,#7a4d2b,#4a2c16)", ink: "#fdf1dc", sub: "rgba(253,241,220,.74)", track: "rgba(0,0,0,.28)", fill: "#f0b23c", coverBg: "#5d3a1f", edge: "rgba(0,0,0,.3)" },
};

/** Livro vazio, mostrado enquanto não há capa. */
function Placeholder({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[44%]" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden opacity=".55">
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H18v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z" />
      <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H18v-3" />
      <path d="M9 7.5h5.5M9 10.5h4" />
    </svg>
  );
}

/**
 * Leitura de livro (vertical, 12 × 18 em): a capa, o nome e o progresso. O progresso pode aparecer como contagem (120 / 320 páginas),
 * como barra ou como os dois, conforme o dono escolher.
 */
export function BookWidget({ style = "paper", title, cover, pages, read, view = "both", frame }: { style?: string; title?: string; cover?: string; pages?: number; read?: number; view?: string; frame?: string | null }) {
  const sk = SKINS[baseStyle(style)] ?? SKINS.paper;
  const total = Math.max(1, Math.round(pages ?? 300));
  const done = Math.min(total, Math.max(0, Math.round(read ?? 0)));
  const pct = Math.round((done / total) * 100);
  const mode: BookView = view === "count" || view === "bar" ? view : "both";
  const name = (title ?? "").trim();
  const finished = done >= total;

  return (
    <WidgetFrame frame={frame} label="Leitura de livro" shape="tall">
      <div className="absolute inset-0 flex flex-col items-center px-[1em] pt-[1em] pb-[0.95em]" style={{ background: sk.bg, color: sk.ink }}>
        {/* a capa ocupa o que sobra; a proporção de um livro (2:3) fica por conta da própria foto */}
        <div className="flex min-h-0 w-full flex-1 justify-center">
        <div className="relative grid h-full max-w-full aspect-[2/3] place-items-center overflow-hidden rounded-[0.45em]" style={{ background: sk.coverBg, boxShadow: `0 0.2em 0.55em rgba(0,0,0,.35), inset 0 0 0 0.06em ${sk.edge}` }}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={name ? `Capa de ${name}` : "Capa do livro"} draggable={false} className="absolute inset-0 size-full object-cover" />
          ) : (
            <Placeholder color={sk.ink} />
          )}
          {/* lombada: um brilho fino à esquerda, como numa capa de verdade */}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[0.9em]" style={{ background: "linear-gradient(90deg,rgba(0,0,0,.28),rgba(255,255,255,.12) 55%,transparent)" }} />
        </div>
        </div>

        {/* o nome fica parado (nada de letreiro, que sairia pela metade na imagem de compartilhar): quebra em até duas linhas, e letra um pouco menor se for comprido */}
        {name && (
          <p className="mt-[0.55em] line-clamp-2 w-full text-center leading-[1.15] font-bold [overflow-wrap:anywhere]" style={{ fontSize: `${name.length > 30 ? 0.82 : name.length > 20 ? 0.92 : 1.05}em` }} title={name}>
            {name}
          </p>
        )}

        <div className="mt-[0.5em] w-full">
          {(mode === "bar" || mode === "both") && (
            <div className="flex items-center gap-[0.55em]">
              <div className="h-[0.7em] flex-1 overflow-hidden rounded-full" style={{ background: sk.track }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progresso da leitura">
                <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: sk.fill }} />
              </div>
              <span className="w-[2.6em] text-right text-[0.85em] font-bold tabular-nums">{pct}%</span>
            </div>
          )}
          {(mode === "count" || mode === "both") && (
            <p className={`text-center leading-tight tabular-nums ${mode === "count" ? "text-[1.7em] font-extrabold" : "mt-[0.3em] text-[0.9em] font-semibold"}`} style={mode === "both" ? { color: sk.sub } : undefined}>
              {mode === "count" ? (
                <>
                  {done} <span style={{ color: sk.sub }}>/ {total}</span>
                </>
              ) : (
                <>
                  {done} / {total} páginas
                </>
              )}
              {mode === "count" && (
                <span className="block text-[0.42em] font-semibold tracking-wide uppercase" style={{ color: sk.sub }}>
                  {finished ? "livro concluído" : "páginas lidas"}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </WidgetFrame>
  );
}
