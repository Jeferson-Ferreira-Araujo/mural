"use client";

import { createContext, useContext } from "react";
import { useLit } from "@/i18n/literal";

/** Detalhe de um pin em segredo que o dono pode ver: o selo no centro do pin mostra ou esconde o conteúdo (só nesta janela). */
export type SecretToggle = { revealed: boolean; toggle: () => void };
const Ctx = createContext<SecretToggle | null>(null);
export const SecretProvider = Ctx.Provider;
export const useSecretToggle = () => useContext(Ctx);

/** Olho aberto no canto de um pin ou display revelado: ao tocar, ele esconde de novo. */
export function SecretHideButton({ onClick, label }: { onClick: () => void; label: string }) {
  const tl = useLit();
  return (
    <button type="button" onClick={onClick} aria-label={tl(label)} title={tl(label)} className="absolute top-[0.6em] right-[0.6em] z-30 grid size-[2.4em] cursor-pointer place-items-center rounded-full bg-black/45 text-white shadow-[0_0.2em_0.6em_rgba(0,0,0,.4)] transition hover:bg-black/65 active:scale-95">
      <svg viewBox="0 0 24 24" className="size-[1.3em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  );
}
