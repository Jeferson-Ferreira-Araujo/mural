"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Janela centralizada do menu da conta (abre por cima do menu lateral). */
export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
      className={`m-auto max-h-[92dvh] ${wide ? "w-[min(94vw,40rem)]" : "w-[min(94vw,32rem)]"} overflow-hidden rounded-3xl border border-[#e6d8bd] bg-[#fbf6ea] p-0 text-[#2f2218] shadow-[0_2rem_5rem_rgba(0,0,0,.55)] backdrop:bg-black/60`}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-[#e6d8bd] px-5 py-3">
            <h2 className="font-title text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-9 cursor-pointer place-items-center rounded-lg text-2xl hover:bg-black/5">
              ×
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
