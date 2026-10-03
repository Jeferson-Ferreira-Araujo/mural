"use client";

import { useEffect, useState } from "react";
import { boardById } from "@/lib/boards";
import { slotsFor, type PlanId } from "@/lib/plans";
import type { BoardItem } from "@/lib/types";
import { Avatar } from "./Avatar";
import { BoardCanvas } from "./board/BoardCanvas";
import { PannableBoard } from "./board/PannableBoard";
import { Brand } from "./Brand";
import { CreateMuralLink } from "./CreateMuralLink";
import { MyMuralLink } from "./MyMuralLink";

type Props = {
  items: BoardItem[];
  plan: PlanId;
  board?: string;
  capacity?: number;
  hasSelection: boolean;
  unlocked: boolean;
  onCompose: ((slot?: number) => void) | null;
  info: { title: string; owner: string; avatar?: string | null };
  /** "Procurar outro mural": volta à busca */
  onChangeMural?: () => void;
};

/** Botão principal de rodapé: deixar um pin. */
export function LeavePinButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#d9a21b] text-lg font-bold text-[#2a1c12] shadow-[0_0.5rem_1.4rem_rgba(120,70,0,.45)] transition hover:bg-[#e6ae22] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]"
    >
      <span aria-hidden className="text-2xl leading-none">+</span> Deixar um PIN
    </button>
  );
}

/**
 * Mural no celular (retrato), como no mockup: topo com o logo e o menu; cabeçalho com a foto e o nome de quem é o mural;
 * o quadro ocupa a tela e se navega arrastando (toque duplo amplia, botão "Ver tudo" afasta); "Deixar um PIN" no rodapé.
 */
export function MobileMural({ items, plan, board, capacity, hasSelection, unlocked, onCompose, info, onChangeMural }: Props) {
  const look = boardById(board);
  const limit = slotsFor(plan, capacity);
  const [menu, setMenu] = useState(false);

  // Esc fecha o menu
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#2a1a0e]">
      {/* topo: logo + menu */}
      <header className="relative z-30 flex h-14 shrink-0 items-center justify-between bg-[#f2e8d3] px-4 shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.25)]">
        <h1 className="sr-only">Pinz</h1>
        <Brand className="h-10" />
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-label="Menu"
          aria-expanded={menu}
          className="grid size-11 cursor-pointer place-items-center rounded-full text-[#2a1c12] transition hover:bg-black/5 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        {menu && (
          <>
            <button type="button" aria-label="Fechar o menu" onClick={() => setMenu(false)} className="fixed inset-0 z-40 cursor-default bg-black/30" />
            <nav aria-label="Menu" className="absolute top-[3.6rem] right-3 z-50 grid w-[min(18rem,86vw)] gap-2 rounded-2xl border border-[#d9c9ad] bg-[#fbf6ea] p-3 shadow-[0_1rem_2.4rem_rgba(0,0,0,.45)]">
              {onChangeMural && (
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    onChangeMural();
                  }}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[0.9em] border border-[#d9c9ad] bg-white/60 px-4 py-3 text-[0.95em] font-semibold text-[#2f2218] transition hover:bg-white active:scale-[0.98]"
                >
                  <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  Procurar outro mural
                </button>
              )}
              <MyMuralLink tone="light" label="Acessar meu mural" className="w-full !py-[0.8em]" />
              <CreateMuralLink className="w-full justify-center border border-[#d9c9ad] bg-white/60 py-3 text-[#2f2218] hover:bg-white" />
            </nav>
          </>
        )}
      </header>

      {/* de quem é o mural + quantos PINZ */}
      <div className="relative z-20 flex shrink-0 items-center gap-3 bg-[#e8dcc2] px-4 py-2 shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.2)]">
        <Avatar src={info.avatar} name={info.owner} className="size-11" />
        <p className="min-w-0 flex-1">
          <span className="block truncate text-base leading-tight font-bold text-[#2a1c12]">{info.title}</span>
          <span className="block text-xs text-[#6b5440]">
            {items.length} de {limit} PINZ · de {info.owner}
          </span>
        </p>
      </div>

      {/* o quadro: arrastar, pinçar, toque duplo */}
      <div className="relative min-h-0 flex-1">
        <PannableBoard ambient={look.image}>
          <BoardCanvas items={items} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} onCompose={onCompose} contain />
        </PannableBoard>
      </div>

      {/* rodapé: deixar um pin */}
      {onCompose && (
        <footer className="relative z-20 shrink-0 bg-[#f2e8d3] px-4 pt-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] shadow-[0_-0.2rem_0.8rem_rgba(0,0,0,.25)]">
          <LeavePinButton onClick={() => onCompose()} />
        </footer>
      )}
    </div>
  );
}
