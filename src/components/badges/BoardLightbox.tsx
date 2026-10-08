"use client";

import { useEffect, useRef } from "react";

/** Mural em tela cheia (para ver os detalhes de perto). Fechar volta exatamente para onde a pessoa estava. */
export function BoardLightbox({ image, name, onClose }: { image: string | null; name: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (image && !d.open) d.showModal();
    if (!image && d.open) d.close();
  }, [image]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={`Mural ${name} em tela cheia`}
      className="m-0 size-full max-h-none max-w-none bg-black/90 p-0 backdrop:bg-black/90"
    >
      {image && (
        <div className="relative grid size-full place-items-center p-3 sm:p-6" onClick={onClose}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={`Mural ${name}`} draggable={false} className="max-h-full max-w-full rounded-xl object-contain shadow-[0_1rem_3rem_rgba(0,0,0,.6)]" />
          <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-sm font-semibold text-white">{name}</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className="absolute top-3 right-3 grid size-11 cursor-pointer place-items-center rounded-full bg-black/60 text-2xl text-white transition hover:bg-black/80 active:scale-90 sm:top-5 sm:right-5">
            ×
          </button>
        </div>
      )}
    </dialog>
  );
}
