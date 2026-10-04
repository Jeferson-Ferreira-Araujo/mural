"use client";

import { BADGES, badgeSrc } from "@/lib/badges";
import { useBadges } from "./BadgeContext";

/**
 * Barra de baixo (só para o dono, no próprio mural): os pins decorativos que ele tem, numa faixa que rola na horizontal.
 * Arraste um deles para o mural; solte um que já está no mural sobre esta barra para tirá-lo (a unidade volta).
 * No FREE cada pin tem 1 unidade (esgota ao colocar); no PLUS é ilimitado. Mais pins e unidades: botão "Loja".
 */
export function BadgeBar({ className = "" }: { className?: string }) {
  const { editable, begin, stock, openStore } = useBadges();
  if (!editable) return null;
  const mine = BADGES.filter((b) => stock(b.key).owned);
  return (
    <section data-badge-bar aria-label="Seus pins decorativos" className={`rounded-2xl border border-white/15 bg-[#1c1510]/80 px-3 pt-2 pb-2.5 text-white shadow-[0_0.6rem_1.6rem_rgba(0,0,0,.45)] backdrop-blur-md ${className}`}>
      <div className="flex items-center justify-between gap-2 px-1 pb-1.5">
        <p className="text-[11px] font-semibold tracking-wide text-white/70 uppercase">Seus pins · arraste para o mural</p>
        <button type="button" onClick={openStore} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#d9a21b] px-3 py-1 text-xs font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] active:scale-95">
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 8h16l-1.2 11.2a1 1 0 0 1-1 .8H6.2a1 1 0 0 1-1-.8L4 8Z" />
            <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
          </svg>
          Loja
        </button>
      </div>
      <ul className="flex gap-2.5 overflow-x-auto overscroll-x-contain pb-1 [touch-action:pan-x] [scrollbar-color:rgba(255,255,255,.35)_transparent] [scrollbar-width:thin]">
        {mine.map((b) => {
          const st = stock(b.key);
          const out = st.left === 0;
          return (
            <li key={b.key} className="relative shrink-0">
              <button
                type="button"
                aria-label={out ? `Pin decorativo ${b.name ?? b.key}: esgotado` : `Pin decorativo ${b.name ?? b.key}: arraste para o mural`}
                onPointerDown={(e) => begin(e.nativeEvent, { kind: "new", key: b.key }, e.currentTarget)}
                onDragStart={(e) => e.preventDefault()}
                className={`grid h-14 w-14 touch-pan-x place-items-center rounded-xl transition ${out ? "cursor-not-allowed" : "cursor-grab hover:bg-white/10 active:cursor-grabbing"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badgeSrc(b.key)} alt="" draggable={false} className={`max-h-12 max-w-12 select-none transition ${out ? "opacity-30 grayscale" : ""}`} style={{ filter: out ? undefined : "drop-shadow(0 2px 3px rgba(0,0,0,.5))" }} />
              </button>
              {out && <span className="pointer-events-none absolute inset-x-0 bottom-0 text-center text-[9px] leading-none font-bold text-white/80 uppercase">Esgotado</span>}
              {!out && st.left !== null && st.left > 1 && <span className="pointer-events-none absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-[#d98a2b] px-1 text-[10px] leading-4 font-bold text-white">{st.left}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
