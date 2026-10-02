"use client";

import { useEffect, useRef } from "react";
import { formatInfo, isSealed, type BoardItem } from "@/lib/types";
import { MessageView } from "../messages/MessageView";

/**
 * Detalhe de um Pinz: no mural com muitos espaços os cards ficam pequenos (só dá para "bater o olho"),
 * então um clique no pin abre o mesmo card em tamanho de leitura, com setas para passar para o vizinho.
 */
export function PinDetail({ items, index, onIndex, onClose, inline = false }: { items: BoardItem[]; index: number | null; onIndex: (i: number) => void; onClose: () => void; /** dentro do próprio quadro (que pode estar girado no celular), em vez de <dialog> */ inline?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = index !== null && !!items[index];

  useEffect(() => {
    const d = ref.current;
    if (!d || inline) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open, inline]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (index === null) return;
      if (e.key === "Escape" && inline) onClose();
      if (e.key === "ArrowRight" && index < items.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, items.length, onIndex, onClose, inline]);

  const item = index !== null ? items[index] : null;
  const label = item ? (isSealed(item) ? "Cápsula PINZ" : formatInfo[item.type].label) : "";
  const arrow =
    "grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-white/20 bg-[#17110c]/70 text-white transition active:scale-95 disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]";

  const content = open && item && index !== null && (
    <div className={`flex w-full flex-col items-center ${inline ? "gap-1" : "gap-4"}`}>
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
        <div className={`grid min-w-0 flex-1 place-items-center ${inline ? "text-[5.2cqh]" : "min-h-[22rem] text-[min(26px,5.2vw)]"}`} key={item.id}>
          <MessageView message={item} />
        </div>
        <button type="button" onClick={() => onIndex(index + 1)} disabled={index >= items.length - 1} aria-label="Próximo" className={arrow}>
          ›
        </button>
      </div>
    </div>
  );

  if (inline) {
    // no celular, dentro do quadro girado: o tamanho segue a ALTURA do quadro (que é o lado curto do aparelho)
    return open ? (
      <div role="dialog" aria-modal="true" aria-label="Ver mensagem em detalhe" onClick={(e) => e.target === e.currentTarget && onClose()} className="absolute inset-0 z-30 grid place-items-center bg-black/75 p-2 text-white backdrop-blur-sm [container-type:size]">
        <div className="w-[min(36rem,94%)]">
          {content}
        </div>
      </div>
    ) : null;
  }

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
        </div>
      )}
    </dialog>
  );
}
