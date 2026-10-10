"use client";

import { DisplayCard, displayName, splitDisplayId } from "../widgets";
import { sampleFor } from "./StoreModal";

/**
 * Aba "Displays" do compositor (clicou num espaço livre do próprio mural): os displays que a pessoa já comprou, cada um com a prévia.
 * Escolher um coloca o display no centro daquele espaço; depois ela pode ampliar e mover do jeito que quiser.
 */
export function DisplayChooser({ ids, onPick, onStore }: { ids: string[]; onPick: (id: string) => void; onStore: () => void }) {
  if (ids.length === 0) {
    return (
      <div className="space-y-4 py-4 text-center">
        <p className="text-[15px] text-[#6b5440]">Você ainda não tem displays. Eles mostram relógio, clima, frase ou versículo do dia no seu mural.</p>
        <button type="button" onClick={onStore} className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#d9a21b] px-5 py-3 text-base font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]">
          Ver displays na Loja
        </button>
      </div>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label="Seus displays">
      {ids.map((id) => {
        const { product, style } = splitDisplayId(id);
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onPick(id)}
              className="flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#e1d3ba] bg-white/70 text-left transition hover:border-[#d98a2b] hover:bg-white active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]"
            >
              <span className="grid place-items-center bg-[#e9d8b6]/70 px-4 py-5">
                <span className="pointer-events-none text-[9px]">
                  <span className="relative block">
                    <DisplayCard data={sampleFor(product, style)} />
                  </span>
                </span>
              </span>
              <span className="block p-3">
                <span className="block font-title text-base font-semibold">{displayName(id)}</span>
                <span className="mt-0.5 block text-xs text-[#6b5440]">Toque para colocar neste espaço</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
