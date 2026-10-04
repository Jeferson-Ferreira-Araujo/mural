"use client";

import { BADGES, badgeSrc } from "@/lib/badges";
import { useBadges } from "./BadgeContext";

/**
 * Barra de baixo (só para o dono, no próprio mural): todos os pins decorativos numa faixa que rola na horizontal.
 * Arraste um deles para o mural; solte um que já está no mural sobre esta barra para tirá-lo.
 */
export function BadgeBar({ className = "" }: { className?: string }) {
  const { editable, begin } = useBadges();
  if (!editable) return null;
  return (
    <section data-badge-bar aria-label="Seus pins decorativos" className={`rounded-2xl border border-white/15 bg-[#1c1510]/80 px-3 pt-2 pb-2.5 text-white shadow-[0_0.6rem_1.6rem_rgba(0,0,0,.45)] backdrop-blur-md ${className}`}>
      <p className="px-1 pb-1.5 text-[11px] font-semibold tracking-wide text-white/70 uppercase">Seus pins · arraste para o mural</p>
      <ul className="no-scrollbar-none flex gap-2.5 overflow-x-auto overscroll-x-contain pb-1 [touch-action:pan-x] [scrollbar-color:rgba(255,255,255,.35)_transparent] [scrollbar-width:thin]">
        {BADGES.map((b) => (
          <li key={b.key} className="shrink-0">
            <button
              type="button"
              aria-label={`Pin decorativo ${b.key}: arraste para o mural`}
              onPointerDown={(e) => begin(e.nativeEvent, { kind: "new", key: b.key }, e.currentTarget)}
              onDragStart={(e) => e.preventDefault()}
              className="grid h-14 w-14 cursor-grab touch-pan-x place-items-center rounded-xl transition hover:bg-white/10 active:cursor-grabbing"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={badgeSrc(b.key)} alt="" draggable={false} className="max-h-12 max-w-12 select-none" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,.5))" }} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
