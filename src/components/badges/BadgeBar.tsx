"use client";

import { BADGES, badgeSrc } from "@/lib/badges";
import { useBadges } from "./BadgeContext";

/**
 * Barra de baixo (só para o dono, no próprio mural): os pins decorativos que ele tem, numa faixa que rola na horizontal.
 * Arraste um deles para o mural; solte um que já está no mural sobre esta barra para tirá-lo (a unidade volta).
 * No FREE cada pin tem 1 unidade (esgota ao colocar); no PLUS é ilimitado. Mais Bottons e unidades: ícone da loja, fixo no início da barra.
 */
export function BadgeBar({ className = "" }: { className?: string }) {
  const { editable, begin, stock, openStore } = useBadges();
  if (!editable) return null;
  const mine = BADGES.filter((b) => stock(b.key).owned);
  return (
    <section data-badge-bar aria-label="Seus Bottons" className={`rounded-2xl border border-white/15 bg-[#1c1510]/80 px-3 py-2 text-white shadow-[0_0.6rem_1.6rem_rgba(0,0,0,.45)] backdrop-blur-md ${className}`}>
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
                aria-label={out ? `Botton ${b.name ?? b.key}: esgotado` : `Botton ${b.name ?? b.key}: arraste para o mural`}
                onPointerDown={(e) => begin(e.nativeEvent, { kind: "new", key: b.key }, e.currentTarget)}
                onDragStart={(e) => e.preventDefault()}
                className={`grid h-14 w-14 touch-pan-x place-items-center rounded-xl transition ${out ? "cursor-not-allowed" : "cursor-grab hover:bg-white/10 active:cursor-grabbing"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badgeSrc(b.key)} alt="" draggable={false} className={`max-h-12 max-w-12 select-none transition ${out ? "opacity-30 grayscale" : ""}`} style={{ filter: out ? undefined : "drop-shadow(0 2px 3px rgba(0,0,0,.5))" }} />
              </button>
              {out && <span className="pointer-events-none absolute inset-x-0 bottom-0 text-center text-[9px] leading-none font-bold text-white/80 uppercase">Esgotado</span>}
              {/* quantidade que a pessoa ainda tem para colocar (∞ = ilimitado) */}
              <span
                aria-label={st.left === null ? "ilimitado" : `${st.left} disponível${st.left === 1 ? "" : "is"}`}
                className={`pointer-events-none absolute top-0 right-0 grid min-w-[1.15rem] place-items-center rounded-full px-1 text-[10px] leading-[1.15rem] font-bold text-white shadow-[0_0.1rem_0.3rem_rgba(0,0,0,.45)] ${out ? "bg-[#7a6b5a]" : "bg-[#d98a2b]"}`}
              >
                {st.left === null ? "∞" : st.left}
              </span>
            </li>
          );
        })}
      </ul>
      </div>
    </section>
  );
}
