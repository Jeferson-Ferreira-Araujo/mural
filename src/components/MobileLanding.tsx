"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useBackClose } from "@/lib/backStack";
import { boardById, boardImageS, WIDE_EXTRA } from "@/lib/boards";
import { BoardCanvas } from "./board/BoardCanvas";
import { PannableBoard } from "./board/PannableBoard";
import { Brand } from "./Brand";
import { authIntent } from "./AuthForm";
import { A11Y_OPEN_EVENT } from "@/lib/a11y";
import type { ViewProps } from "./viewProps";
import { useTranslations } from "next-intl";
import { LanguagePicker } from "./LanguagePicker";

/**
 * Tela inicial no celular para quem ainda não entrou: o mesmo mural de exemplo do computador, completo e navegável (arrastar, pinça, aproximar),
 * com o logo e os botões Entrar e Criar conta no topo. O formulário abre numa folha por cima do mural quando a pessoa toca num dos botões.
 */
function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 opacity-80" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function MobileLanding({ items, plan, board, capacity, hasSelection, unlocked, locked, onCompose, onNotify, panel, boardPending }: Pick<ViewProps, "items" | "plan" | "board" | "capacity" | "hasSelection" | "unlocked" | "locked" | "onCompose" | "onNotify" | "boardPending"> & { panel: (tone: "dark" | "light", part?: "form") => ReactNode }) {
  const tx = useTranslations("components.MobileLanding");
  const look = boardById(board);
  const [open, setOpen] = useState(false);
  // o quadro só aparece depois de montado e com o fundo sorteado: antes disso a página do servidor mostrava um pedaço do primeiro quadro, ampliado, no canto
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const ready = mounted && !boardPending;
  const ref = useRef<HTMLDialogElement>(null);
  useBackClose(open, () => setOpen(false));

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // página /entrar (ex.: depois de sair da conta): a folha do formulário já abre, na aba pedida (?modo=entrar = Entrar; sem isso, Criar conta)
  useEffect(() => {
    if (window.location.pathname !== "/entrar") return;
    authIntent.mode = new URLSearchParams(window.location.search).get("modo") === "entrar" ? "login" : "signup";
    authIntent.touched = true;
    setOpen(true);
  }, []);

  const show = (mode: "login" | "signup") => {
    authIntent.mode = mode;
    authIntent.touched = true;
    setOpen(true);
  };
  
  return (
    <div className={`fixed inset-0 flex flex-col overflow-hidden bg-[#2a1a0e] transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}>
      {/* fundo: a mesma névoa colorida do mural (a foto do quadro bem desfocada), igual por trás do logo, do mural e do rodapé */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={boardImageS(look)} alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full scale-125 object-cover opacity-80 blur-md" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#140a04]/70 via-transparent to-[#140a04]/60" />
      <h1 className="sr-only">{tx("pinz")}</h1>
      <LanguagePicker variant="icon" align="left" tone="dark" className="absolute top-[max(0.6rem,env(safe-area-inset-top))] left-3 z-30 shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.45)] backdrop-blur" />
      <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(A11Y_OPEN_EVENT))} aria-label={tx("acessibilidade")} title={tx("acessibilidade")} className="absolute top-[max(0.6rem,env(safe-area-inset-top))] right-3 z-30 grid size-10 cursor-pointer place-items-center rounded-full bg-[#17110c]/70 text-white shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.45)] backdrop-blur transition active:scale-95">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="4.5" r="1.8" />
          <path d="M5 8.5c2.3.9 4.7 1.3 7 1.3s4.7-.4 7-1.3M12 9.8V14m0 0-3 6m3-6 3 6" />
        </svg>
      </button>

      {/* logo grande, frase de mão e apoio, no topo */}
      <header className="relative z-20 flex min-h-0 flex-1 flex-col items-center justify-evenly px-5 pt-[max(0.6rem,env(safe-area-inset-top))] pb-2 text-center">
        <Brand className="mx-auto h-[clamp(4.5rem,22dvh,12rem)]" />
        <p className="mx-auto max-w-[23rem] text-[15px] leading-snug text-[#f6efe2]/80 [text-shadow:0_0.1em_0.4em_rgba(0,0,0,.6)]">{tx("compartilheMomentosEspeciaisRecebaRecados")}</p>
      </header>

      {/* o mural de exemplo, inteiro, no meio: arrasta, pinça e aproxima como um mural de verdade */}
      {/* o mural inteiro, como sempre; a foto panorâmica passa das laterais e, no primeiro acesso, o quadro passeia para os dois lados para mostrar que dá para arrastar */}
      <div className="relative w-full shrink-0 max-h-[52dvh]" style={{ aspectRatio: "3 / 2" }}>
        <PannableBoard bare scene={look.wide ? { src: look.wide, extra: WIDE_EXTRA } : undefined} hintOnce="pinz:landing-hint">
          <BoardCanvas items={items} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} locked={locked} onCompose={onCompose} onNotify={onNotify} contain />
        </PannableBoard>
      </div>

      {/* rodapé: criar o mural, entrar e o que o Pinz oferece */}
      <section className="relative z-30 shrink-0 rounded-t-[2rem] bg-[#f6efe0] px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-[#2f2218] shadow-[0_-0.5rem_1.6rem_rgba(0,0,0,.45)]">
        <button type="button" onClick={() => show("signup")} className="flex h-14 w-full cursor-pointer items-center gap-3 rounded-2xl bg-gradient-to-b from-[#ffd75e] to-[#f5a50f] px-3 text-[#2a1c12] shadow-[0_0.3rem_0.9rem_rgba(190,110,0,.35),inset_0_1px_0_rgba(255,255,255,.55)] ring-1 ring-[#e39a0b]/60 transition hover:brightness-105 active:scale-[0.99]">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2a1c12] text-[#f6efe0]">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className="flex-1 text-center text-lg font-bold">{tx("criarMeuMural")}</span>
          <Chevron />
        </button>
        <button type="button" onClick={() => show("login")} className="mt-2.5 flex h-12 w-full cursor-pointer items-center gap-3 rounded-2xl border border-[#d9c9ad] bg-white px-3 text-[#2f2218] transition hover:bg-[#fffdf7] active:scale-[0.99]">
          <svg viewBox="0 0 24 24" className="size-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c.8-3.600 3.500-5.500 7-5.500s6.200 1.900 7 5.500" />
          </svg>
          <span className="flex-1 text-center text-base font-bold">{tx("jaTenhoContaEntrar")}</span>
          <Chevron />
        </button>
      </section>

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        aria-label={tx("entrarOuCriarConta")}
        className="m-auto max-h-[94dvh] w-[min(94vw,30rem)] overflow-y-auto bg-transparent p-0 backdrop:bg-black/70"
      >
        {open && (
          <div>
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setOpen(false)} aria-label={tx("fechar")} className="grid size-10 cursor-pointer place-items-center rounded-full bg-white/90 text-2xl text-[#2f2218] shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.4)]">
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
