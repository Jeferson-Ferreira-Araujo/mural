"use client";

import { useEffect, useRef } from "react";
import { SearchBox } from "../SearchBox";

/** Pesquisa de murais (ícone do cabeçalho): abre uma janela com o campo de busca. */
export function SearchDialog({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (nick: string) => void }) {
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
      aria-label="Procurar mural"
      className="m-auto mt-[12vh] w-[min(92vw,28rem)] overflow-visible rounded-3xl border border-[#e6d8bd] bg-[#fbf6ea] p-0 text-[#2f2218] shadow-[0_2rem_5rem_rgba(0,0,0,.55)] backdrop:bg-black/60 max-sm:mt-[6vh]"
    >
      {open && (
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-title text-lg font-semibold">Procurar mural</h2>
            <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-9 cursor-pointer place-items-center rounded-full text-xl hover:bg-black/5">
              ×
            </button>
          </div>
          <SearchBox
            tone="light"
            onSelect={(n) => {
              onClose();
              onSelect(n);
            }}
          />
        </div>
      )}
    </dialog>
  );
}
