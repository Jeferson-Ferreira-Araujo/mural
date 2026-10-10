"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { BADGES, badgeSrc } from "@/lib/badges";
import { useBadges } from "./BadgeContext";

const DISPLAY_LABEL: Record<string, string> = { bible: "Versículo do dia", motivation: "Frase motivacional", clock: "Relógio", weather: "Clima" };
/** Miniatura de cada display: cores da paisagem e um sinal. */
const TILE: Record<string, [string, string, string]> = { bible: ["#f9e7ad", "#d9a352", "Sl"], motivation: ["#2b4a8c", "#f3a766", "★"], clock: ["#4fa8ee", "#d9f0ff", "12:30"], weather: ["#7d93a8", "#c6d2dc", "24°"] };

/**
 * Barra de baixo (só para o dono, no próprio mural): os pins decorativos que ele tem, numa faixa que rola na horizontal.
 * Arraste um deles para o mural; solte um que já está no mural sobre esta barra para tirá-lo (a unidade volta).
 * Cada pin tem 1 unidade + as extras compradas (esgota ao colocar, volta ao tirar do mural). Ninguém tem ilimitado. Mais Bottons e unidades: ícone da loja, fixo no início da barra.
 */
export function BadgeBar({ className = "" }: { className?: string }) {
  const [pickOpen, setPickOpen] = useState(false);
  const { editable, begin, stock, openStore, acquiredAt, draggingId, draggingNew, displays, pickDisplay, placing } = useBadges();
  if (!editable) return null;
  // ordem da barra: os que ainda têm unidades vêm primeiro, os de MAIOR quantidade na frente; empate: o comprado mais recentemente primeiro;
  // quem ficou sem unidades vai para o final (continua visível, só apagado)
  const mine = BADGES.filter((b) => stock(b.key).owned).sort((a, b) => {
    const la = stock(a.key).left ?? 0;
    const lb = stock(b.key).left ?? 0;
    if ((la > 0) !== (lb > 0)) return la > 0 ? -1 : 1;
    if (la !== lb) return lb - la;
    return (acquiredAt(b.key) ?? 0) - (acquiredAt(a.key) ?? 0);
  });
  return (
    <section data-badge-bar aria-label="Seus Bottons" className={`relative rounded-2xl border border-white/15 bg-[#1c1510]/80 px-3 py-2 text-white shadow-[0_0.6rem_1.6rem_rgba(0,0,0,.45)] backdrop-blur-md ${className}`}>
      {/* arrastando um botton que já está no mural: avisa onde soltar para devolvê-lo */}
      {draggingId && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl border-2 border-dashed border-[#f2c230] bg-[#1c1510]/90 px-3 text-center text-sm font-bold text-[#f7f0dd]">
          Solte aqui para tirar do mural
        </div>
      )}
      {/* arrastando um botton novo: avisa para soltar no mural */}
      {draggingNew && !draggingId && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl border-2 border-dashed border-[#f2c230] bg-[#1c1510]/90 px-3 text-center text-sm font-bold text-[#f7f0dd]">
          Solte o pin no mural
        </div>
      )}
      <div className="flex items-center gap-2">
        {/* a loja é o primeiro item da barra e fica fixa: só os bottons ao lado rolam */}
        <button type="button" onClick={openStore} aria-label="Loja de Bottons" title="Loja" className="flex h-14 w-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl bg-[#d9a21b] text-[#2a1c12] shadow-[0_0.2rem_0.6rem_rgba(0,0,0,.4)] transition hover:bg-[#e6ae22] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 8h16l-1.2 11.2a1 1 0 0 1-1 .8H6.2a1 1 0 0 1-1-.8L4 8Z" />
            <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
          </svg>
          <span className="text-[11px] leading-none font-bold">Loja</span>
        </button>
        <span aria-hidden className="h-9 w-px shrink-0 bg-white/20" />
      <ul className="flex min-w-0 flex-1 gap-2.5 overflow-x-auto overscroll-x-contain pt-1.5 pr-1.5 pb-1 [touch-action:pan-x] [scrollbar-color:rgba(255,255,255,.35)_transparent] [scrollbar-width:thin]">
        {mine.map((b) => {
          const st = stock(b.key);
          const out = st.left === 0;
          return (
            <li key={b.key} className="relative shrink-0">
              <button
                type="button"
                aria-label={out ? `Botton ${b.name ?? b.key}: sem unidades disponíveis` : `Botton ${b.name ?? b.key}: arraste para o mural`}
                onPointerDown={(e) => begin(e.nativeEvent, { kind: "new", key: b.key }, e.currentTarget)}
                onDragStart={(e) => e.preventDefault()}
                className={`grid h-14 w-14 touch-pan-x place-items-center rounded-xl transition ${out ? "cursor-not-allowed" : "cursor-grab hover:bg-white/10 active:cursor-grabbing"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badgeSrc(b.key)} alt="" draggable={false} className={`max-h-12 max-w-12 select-none transition ${out ? "opacity-30 grayscale" : ""}`} style={{ filter: out ? undefined : "drop-shadow(0 2px 3px rgba(0,0,0,.5))" }} />
              </button>
              {/* quantidade que a pessoa ainda tem para colocar */}
              <span
                aria-label={`${st.left ?? 0} disponível${st.left === 1 ? "" : "is"}`}
                className={`pointer-events-none absolute top-0 right-0 grid min-w-[1.15rem] place-items-center rounded-md px-1 text-[10px] leading-[1.15rem] font-bold text-white shadow-[0_0.1rem_0.3rem_rgba(0,0,0,.45)] ${out ? "bg-[#7a6b5a]" : "bg-[#d98a2b]"}`}
              >
                {st.left ?? 0}
              </span>
            </li>
          );
        })}
      </ul>
      {/* displays (versículo, frase, relógio, clima): um botão só, como a Loja; com mais de um, abre a lista para escolher */}
      {displays.length > 0 && (
        <>
          <span aria-hidden className="h-9 w-px shrink-0 bg-white/20" />
          <button
            type="button"
            disabled={placing}
            onClick={() => (displays.length === 1 ? pickDisplay(displays[0]) : setPickOpen(true))}
            aria-label={displays.length === 1 ? `${DISPLAY_LABEL[displays[0]] ?? displays[0]}: toque para colocar no mural` : "Seus displays: escolher qual colocar no mural"}
            title="Displays"
            className="flex h-14 w-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl bg-white/10 text-white transition hover:bg-white/20 active:scale-95 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="5" width="18" height="12" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            <span className="text-[11px] leading-none font-bold">Displays</span>
          </button>
        </>
      )}
      {pickOpen && createPortal(
        <div className="fixed inset-0 z-[390] grid place-items-center bg-black/55 p-4" onClick={() => setPickOpen(false)}>
          <div role="dialog" aria-label="Escolher um display" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-[#fbf6ea] p-4 text-[#2a1c12] shadow-[0_1rem_3rem_rgba(0,0,0,.5)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-title text-lg font-semibold">Qual display colocar?</h2>
              <button type="button" aria-label="Fechar" onClick={() => setPickOpen(false)} className="grid size-8 cursor-pointer place-items-center rounded-lg hover:bg-black/5">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <ul className="grid gap-2">
              {displays.map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => {
                      setPickOpen(false);
                      pickDisplay(p);
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[#e1d3ba] bg-white/70 p-2.5 text-left transition hover:bg-white active:scale-[0.99]"
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-[10px] p-[2px] shadow-[0_0.15rem_0.3rem_rgba(0,0,0,.3)]" style={{ background: "linear-gradient(145deg,#f6e2b0,#b88a3a)" }}>
                      <span className="grid size-full place-items-center rounded-[8px] text-[10px] leading-none font-bold text-[#2a3a4a]" style={{ background: `linear-gradient(180deg, ${TILE[p]?.[0] ?? "#4fa8ee"}, ${TILE[p]?.[1] ?? "#d9f0ff"})` }}>
                        {TILE[p]?.[2]}
                      </span>
                    </span>
                    <span className="font-semibold">{DISPLAY_LABEL[p] ?? p}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>,
        document.body,
      )}
      </div>
    </section>
  );
}
