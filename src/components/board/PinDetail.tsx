"use client";

import { useEffect, useRef } from "react";
import { formatInfo, isHidden, isSealed, type BoardItem } from "@/lib/types";
import { useState } from "react";
import { MessageView } from "../messages/MessageView";
import { useModeration } from "./ModerationContext";

/**
 * Detalhe de um Pinz: no mural com muitos espaços os cards ficam pequenos (só dá para "bater o olho"),
 * então um clique no pin abre o mesmo card em tamanho de leitura, com setas para passar para o vizinho.
 */
export function PinDetail({ items, index, onIndex, onClose }: { items: BoardItem[]; index: number | null; onIndex: (i: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = index !== null && !!items[index];
  const mod = useModeration();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (index === null) return;
      if (e.key === "ArrowRight" && index < items.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, items.length, onIndex]);

  const item = index !== null ? items[index] : null;
  const label = item ? (isSealed(item) ? "Cápsula PINZ" : isHidden(item) ? "Pin em blur" : formatInfo[item.type].label) : "";
  const arrow =
    "grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-white/20 bg-[#17110c]/70 text-white transition active:scale-95 disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label="Ver mensagem em detalhe"
      className="m-auto w-[min(94vw,34rem)] overflow-visible bg-transparent p-0 text-white backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {open && item && index !== null && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex w-full items-center justify-between px-1">
            <p className="text-sm font-semibold text-white/80">
              {label} · {index + 1} de {items.length}
            </p>
            <button type="button" onClick={onClose} aria-label="Fechar" className={arrow}>
              ×
            </button>
          </div>
          <div className="flex w-full items-center justify-center gap-3">
            <button type="button" onClick={() => onIndex(index - 1)} disabled={index <= 0} aria-label="Anterior" className={arrow}>
              ‹
            </button>
            <div className="grid min-h-[22rem] min-w-0 flex-1 place-items-center text-[min(26px,5.2vw)]" key={item.id}>
              <MessageView message={item} />
            </div>
            <button type="button" onClick={() => onIndex(index + 1)} disabled={index >= items.length - 1} aria-label="Próximo" className={arrow}>
              ›
            </button>
          </div>
          {mod && item && !isSealed(item) && !isHidden(item) && item.pending && (
            <div className="flex w-full gap-3" role="group" aria-label="Moderar este pin">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const ok = await mod.moderate(item.id, false);
                  setBusy(false);
                  if (ok) onClose();
                }}
                className="flex-1 cursor-pointer rounded-xl border border-white/25 bg-[#17110c]/80 px-4 py-3 text-base font-semibold text-white transition hover:bg-[#2b1c12] disabled:opacity-60"
              >
                Recusar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await mod.moderate(item.id, true);
                  setBusy(false);
                }}
                className="flex-1 cursor-pointer rounded-xl bg-[#d9a21b] px-4 py-3 text-base font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] disabled:opacity-60"
              >
                Aprovar
              </button>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
