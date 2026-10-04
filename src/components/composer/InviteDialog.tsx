"use client";

import { useEffect, useRef } from "react";
import { ghostButton } from "../ui";

/** Depois de deixar o pin sem conta: convite discreto para criar o próprio mural (uma vez por visita). */
export function InviteDialog({ open, onClose, href }: { open: boolean; onClose: () => void; href: string }) {
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
      aria-label="Criar o seu mural"
      className="m-auto w-[min(92vw,26rem)] rounded-3xl border border-[#e6d8bd] bg-[#fbf6ea] p-0 text-[#2f2218] shadow-[0_2rem_5rem_rgba(0,0,0,.55)] backdrop:bg-black/60"
    >
      {open && (
        <div className="p-6 text-center">
          <p className="text-3xl" aria-hidden>
            📌
          </p>
          <h2 className="font-title mt-2 text-xl font-semibold">Seu pin foi enviado!</h2>
          <p className="mt-2 text-[#4a3826]">Ele aparece no mural quando o dono liberar. Que tal ter o seu próprio mural também?</p>
          <a href={href} className="mt-5 block rounded-xl bg-[#d9a21b] px-4 py-3 font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a1c12]">
            Criar o meu mural
          </a>
          <button type="button" onClick={onClose} className={`${ghostButton} mt-2 w-full`}>
            Agora não
          </button>
        </div>
      )}
    </dialog>
  );
}
