"use client";

import { useEffect, useRef } from "react";

/**
 * Aviso de sucesso em pop-up: janela nativa centralizada em TODA a tela (acima do menu lateral e de qualquer outra janela), com fundo escurecido.
 * Some sozinha; tocar no fundo ou apertar Esc também fecha.
 */
export function SuccessPopup({ open, message, detail, onClose, ms = 2200 }: { open: boolean; message: string; /** linha menor embaixo (opcional) */ detail?: string; onClose?: () => void; ms?: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    if (!open) return;
    const t = window.setTimeout(() => onClose?.(), ms);
    return () => window.clearTimeout(t);
  }, [open, ms, onClose]);
  return (
    <dialog
      ref={ref}
      aria-label={message}
      onClose={() => open && onClose?.()}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      className="m-auto w-[min(88vw,20rem)] max-w-none overflow-visible rounded-3xl border-0 bg-transparent p-0 backdrop:bg-[#1f3a26]/50 backdrop:backdrop-blur-sm"
    >
      <div role="status" className="rounded-3xl border border-[#cfe6d3] bg-[#f6fbf5] px-6 py-7 text-center text-[#1f4d2b] shadow-[0_1rem_3rem_rgba(0,0,0,.4)]" style={{ animation: "buy-pop 0.5s ease" }}>
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-[#3aa655] text-white shadow-[0_0.5rem_1.6rem_rgba(58,166,85,.5)]">
          <svg viewBox="0 0 24 24" className="size-11" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
        <p className="font-title mt-4 text-2xl leading-tight font-semibold">{message}</p>
        {detail && <p className="mt-1.5 text-sm text-[#3f6a4b]">{detail}</p>}
      </div>
    </dialog>
  );
}
