"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useBackClose } from "@/lib/backStack";
import { boardById } from "@/lib/boards";
import { BoardCanvas } from "./board/BoardCanvas";
import { PannableBoard } from "./board/PannableBoard";
import { Brand } from "./Brand";
import { authIntent } from "./AuthForm";
import type { ViewProps } from "./viewProps";

/**
 * Tela inicial no celular para quem ainda não entrou: o mesmo mural de exemplo do computador, completo e navegável (arrastar, pinça, aproximar),
 * com o logo e os botões Entrar e Criar conta no topo. O formulário abre numa folha por cima do mural quando a pessoa toca num dos botões.
 */
export function MobileLanding({ items, plan, board, capacity, hasSelection, unlocked, locked, onCompose, onNotify, panel }: Pick<ViewProps, "items" | "plan" | "board" | "capacity" | "hasSelection" | "unlocked" | "locked" | "onCompose" | "onNotify"> & { panel: (tone: "dark" | "light", part?: "form") => ReactNode }) {
  const look = boardById(board);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useBackClose(open, () => setOpen(false));

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const show = (mode: "login" | "signup") => {
    authIntent.mode = mode;
    setOpen(true);
  };
  const btn = "inline-flex h-10 cursor-pointer items-center rounded-xl px-4 text-sm font-semibold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#2a1a0e]">
      <header className="relative z-30 flex h-14 shrink-0 items-center justify-between gap-2 bg-[#f2e8d3] px-3 shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.25)]">
        <h1 className="sr-only">Pinz</h1>
        <Brand className="h-10" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => show("login")} className={`${btn} border border-[#d9c9ad] bg-white/70 text-[#2f2218] hover:bg-white`}>
            Entrar
          </button>
          <button type="button" onClick={() => show("signup")} className={`${btn} bg-[#1f232b] text-white hover:bg-[#2c313b]`}>
            Criar conta
          </button>
        </div>
      </header>

      {/* o mural de exemplo, inteiro: arrasta, pinça e aproxima como um mural de verdade */}
      <div className="relative min-h-0 flex-1">
        <PannableBoard ambient={look.image}>
          <BoardCanvas items={items} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} locked={locked} onCompose={onCompose} onNotify={onNotify} contain />
        </PannableBoard>
      </div>

      {/* apresentação e atalho para criar a conta */}
      <section className="relative z-30 shrink-0 rounded-t-3xl bg-[#f2e8d3] px-5 pt-4 pb-[max(1.1rem,env(safe-area-inset-bottom))] text-center text-[#2f2218] shadow-[0_-0.4rem_1.4rem_rgba(0,0,0,.4)]">
        <h2 className="font-title text-xl leading-tight font-semibold">Seu mural de momentos compartilhados</h2>
        <p className="mt-1 text-sm text-[#6b5440]">Receba recados, fotos, músicas e vídeos de quem você ama e decore do seu jeito.</p>
        <button type="button" onClick={() => show("signup")} className="mt-3 w-full cursor-pointer rounded-xl bg-[#d9a21b] px-4 py-3 text-base font-bold text-[#2a1c12] shadow-[0_0.25rem_0.8rem_rgba(150,90,0,.35)] transition hover:bg-[#e6ae22] active:scale-[0.99]">
          Criar meu mural grátis
        </button>
        <button type="button" onClick={() => show("login")} className="mt-1 w-full cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-[#4a3826] hover:bg-black/5">
          Já tenho conta
        </button>
      </section>

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        aria-label="Entrar ou criar conta"
        className="m-auto max-h-[94dvh] w-[min(94vw,30rem)] overflow-y-auto bg-transparent p-0 backdrop:bg-black/70"
      >
        {open && (
          <div>
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="grid size-10 cursor-pointer place-items-center rounded-full bg-white/90 text-2xl text-[#2f2218] shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.4)]">
                ×
              </button>
            </div>
            <div className="text-[15px]">{panel("dark")}</div>
          </div>
        )}
      </dialog>
    </div>
  );
}
