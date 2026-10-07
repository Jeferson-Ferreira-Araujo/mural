"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Janela centralizada do menu da conta (abre por cima do menu lateral). */
export function Modal({ open, onClose, title, label, children, wide = false, xl = false, aside }: { aside?: ReactNode; xl?: boolean; open: boolean; onClose: () => void; /** título do cabeçalho; vazio = janela sem título (só o botão de fechar) */ title: string; /** nome da janela para leitores de tela quando não há título */ label?: string; children: ReactNode; wide?: boolean }) {
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
      aria-label={title || label}
      className={`m-auto max-h-[92dvh] ${xl ? "w-[min(96vw,62rem)]" : wide ? "w-[min(94vw,40rem)]" : "w-[min(94vw,32rem)]"} overflow-hidden rounded-3xl border border-[#e6d8bd] bg-[#fbf6ea] p-0 text-[#2f2218] shadow-[0_2rem_5rem_rgba(0,0,0,.55)] backdrop:bg-black/60`}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <header className={`flex items-center gap-3 px-5 py-3 ${title ? "justify-between border-b border-[#e6d8bd]" : "justify-end pb-0"}`}>
            {title && <h2 className="font-title text-lg font-semibold">{title}</h2>}
            {aside && <div className="ml-auto">{aside}</div>}
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
