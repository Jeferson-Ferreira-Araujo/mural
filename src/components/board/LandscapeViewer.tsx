"use client";

import { useEffect } from "react";
import { boardById } from "@/lib/boards";
import type { PlanId } from "@/lib/plans";
import type { BoardItem } from "@/lib/types";
import { BoardCanvas } from "./BoardCanvas";

/**
 * Mural em tela cheia e SEMPRE na horizontal (celular). Se o aparelho está em pé, o quadro é girado 90° por CSS
 * (`.landscape-stage` em globals.css); se já está deitado, ocupa a tela normalmente. Onde o navegador deixa
 * (Android), também pede tela cheia e trava a orientação. É só para ver: não cola pin por aqui.
 */
export function LandscapeViewer({ open, onClose, items, plan, board, capacity, hasSelection, unlocked }: { open: boolean; onClose: () => void; items: BoardItem[]; plan: PlanId; board?: string; capacity?: number; hasSelection: boolean; unlocked: boolean }) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // melhor esforço: tela cheia + travar na horizontal (não existe em todos os navegadores, ex.: iPhone)
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    void document.documentElement
      .requestFullscreen?.()
      .then(() => orientation.lock?.("landscape"))
      .catch(() => undefined);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
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

  return (
    <div role="dialog" aria-modal="true" aria-label="Mural em tela cheia" className="fixed inset-0 z-50 overflow-hidden bg-black">
      <div className="landscape-stage overflow-hidden bg-[#3b2616]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={look.image} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-80 blur-2xl" />
        <BoardCanvas items={items} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} onCompose={null} inlineDetail contain />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 left-2 z-40 inline-flex h-9 cursor-pointer items-center gap-1 rounded-full bg-[#17110c]/80 pr-3.5 pl-2.5 text-sm font-semibold text-white shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
          Fechar
        </button>
      </div>
    </div>
  );
}
