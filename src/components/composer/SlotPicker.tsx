"use client";

import { gridFor } from "@/lib/slots";

/**
 * "Onde colar?": um mini quadro com todos os espaços. O visitante escolhe qualquer espaço livre (não precisa ser em ordem).
 * Ocupado = pin já colado; bloqueado = o plano do dono ainda não libera.
 */
export function SlotPicker({ capacity, available, taken, value, onChange }: { capacity: number; available: number; taken: number[]; value: number | null; onChange: (slot: number) => void }) {
  const { cols } = gridFor(capacity);
  const used = new Set(taken);

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-[#4a3826]">Onde você quer colar?</legend>
      <div role="radiogroup" aria-label="Espaço do mural" className="mx-auto mt-2 grid max-w-sm gap-1.5 rounded-xl border border-[#d9c9ad] bg-[#e9d8b6]/60 p-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: capacity }, (_, i) => {
          const occupied = used.has(i);
          const locked = !occupied && i >= available;
          const selected = value === i;
          const label = `Linha ${Math.floor(i / cols) + 1}, coluna ${(i % cols) + 1}${occupied ? " (ocupado)" : locked ? " (bloqueado)" : ""}`;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={label}
              title={label}
              disabled={occupied || locked}
              onClick={() => onChange(i)}
              className={`grid aspect-[14/13] place-items-center rounded-md border-2 text-[10px] leading-none font-bold transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#d98a2b] ${
                selected
                  ? "cursor-pointer border-[#1f232b] bg-[#d9a21b] text-[#1f232b] shadow-[0_0_0_2px_rgba(217,162,27,.4)]"
                  : occupied
                    ? "cursor-not-allowed border-transparent bg-[#8a6b45]/55 text-white/70"
                    : locked
                      ? "cursor-not-allowed border-dotted border-black/25 bg-black/10 text-black/35"
                      : "cursor-pointer border-dashed border-[#a8884f] bg-white/50 text-[#6b5440] hover:bg-white/90"
              }`}
            >
              {selected ? "✓" : occupied ? "●" : locked ? "🔒" : ""}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
