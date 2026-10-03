"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "../Avatar";
import { boardById } from "@/lib/boards";
import { slotsFor, type PlanId } from "@/lib/plans";
import type { BoardItem } from "@/lib/types";
import { BoardCanvas } from "./BoardCanvas";

export type MuralInfo = { title: string; owner: string; avatar?: string | null };

/**
 * Mural em tela cheia e SEMPRE na horizontal (celular): é por aqui que a pessoa interage.
 * Se o aparelho está em pé, o quadro é girado 90° por CSS (`.landscape-stage` em globals.css); se já está deitado, ocupa a tela normalmente.
 * Onde o navegador deixa (Android), também pede tela cheia e trava a orientação.
 * Os controles fixos ficam nas LATERAIS (sobram nas margens, porque o quadro é 3:2 e a tela deitada é mais larga):
 * à esquerda, fechar e a foto de quem é o mural; à direita, quantos pins e o botão "Novo pin".
 * Tocar num espaço livre cola um pin ali; tocar num pin abre o detalhe.
 */
export function LandscapeViewer({
  open,
  onClose,
  onCompose,
  items,
  plan,
  board,
  capacity,
  hasSelection,
  unlocked,
  info,
  composing = false,
  onStage,
}: {
  open: boolean;
  onClose: () => void;
  /** tocar num espaço livre: o compositor abre DENTRO do mural (que continua ao fundo) */
  onCompose: ((slot?: number) => void) | null;
  items: BoardItem[];
  plan: PlanId;
  board?: string;
  capacity?: number;
  hasSelection: boolean;
  unlocked: boolean;
  info?: MuralInfo;
  /** o compositor está aberto dentro do mural */
  composing?: boolean;
  /** entrega o elemento do palco (para o compositor abrir dentro dele) */
  onStage?: (el: HTMLDivElement | null) => void;
}) {
  const [hint, setHint] = useState(false); // destaca os espaços livres depois de tocar em "Novo pin"
  const [turnHint, setTurnHint] = useState(false); // "vire o celular" (só quando ele está em pé)
  const composingRef = useRef(composing);
  composingRef.current = composing;

  useEffect(() => {
    // no desktop (lg+) este visualizador fica escondido por CSS: nada de travar a rolagem nem pedir tela cheia
    if (!open || window.matchMedia("(min-width: 1024px)").matches) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // melhor esforço: tela cheia + travar na horizontal (não existe em todos os navegadores, ex.: iPhone)
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    void document.documentElement
      .requestFullscreen?.()
      .then(() => orientation.lock?.("landscape"))
      .catch(() => undefined);
    // com o compositor aberto, Esc fecha só o compositor (ele mesmo escuta)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !composingRef.current && onClose();
    window.addEventListener("keydown", onKey);
    // aviso rápido para virar o celular, se ele está em pé
    let t: number | undefined;
    if (window.matchMedia("(orientation: portrait)").matches) {
      setTurnHint(true);
      t = window.setTimeout(() => setTurnHint(false), 4500);
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      if (t) window.clearTimeout(t);
      setTurnHint(false);
      try {
        orientation.unlock?.();
        if (document.fullscreenElement) void document.exitFullscreen();
      } catch {
        /* sem suporte */
      }
    };
  }, [open, onClose]);

  if (!open) return null;
  const look = boardById(board);
  const limit = slotsFor(plan, capacity);

  function newPin() {
    if (!onCompose) return;
    setHint(true);
    window.setTimeout(() => setHint(false), 4500);
  }

  const rail = "absolute inset-y-0 z-40 flex w-[3.4rem] flex-col items-center justify-center gap-3";
  const round = "grid size-11 cursor-pointer place-items-center rounded-full bg-[#17110c]/80 text-white shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]";

  return (
    <div role="dialog" aria-modal="true" aria-label="Mural em tela cheia" className="fixed inset-0 z-50 overflow-hidden bg-black">
      <div ref={onStage} className="landscape-stage overflow-hidden bg-[#3b2616]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={look.image} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-80 blur-2xl" />
        <BoardCanvas items={items} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} onCompose={onCompose} hint={hint} inlineDetail contain />

        {/* lateral esquerda: fechar + quem é o dono do mural */}
        <div className={`${rail} left-0`}>
          <button type="button" onClick={onClose} aria-label="Fechar o mural" title="Fechar" className={round}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
          {info && (
            <div className="grid justify-items-center gap-1" title={`${info.title} · de ${info.owner}`}>
              <Avatar src={info.avatar} name={info.owner} className="size-11" />
              <span className="max-w-[3.2rem] truncate text-[10px] leading-none font-semibold text-white/85 [text-shadow:0_1px_3px_rgba(0,0,0,.8)]">{info.owner}</span>
            </div>
          )}
        </div>

        {/* lateral direita: quantos pins + novo pin */}
        <div className={`${rail} right-0`}>
          <p className="rounded-full bg-[#17110c]/80 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur" aria-label={`${items.length} de ${limit} pins`}>
            {items.length}/{limit}
          </p>
          {onCompose && (
            <button type="button" onClick={newPin} aria-label="Novo pin" className={`${round} !size-[3.1rem] !bg-[#d9a21b] !text-[#2a1c12]`}>
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
          {onCompose && <span className="text-[10px] leading-none font-semibold text-white/85 [text-shadow:0_1px_3px_rgba(0,0,0,.8)]">Novo pin</span>}
        </div>

        {/* dicas rápidas, no centro de baixo */}
        {(hint || turnHint) && (
          <p role="status" className="absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#17110c]/85 px-4 py-2 text-xs font-semibold whitespace-nowrap text-white shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur">
            {hint ? "Toque num espaço livre para colar o seu pin" : "↻ Vire o celular para ver o mural inteiro"}
          </p>
        )}
      </div>
    </div>
  );
}
