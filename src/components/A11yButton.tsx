"use client";

import { useTranslations } from "next-intl";
import { A11Y_OPEN_EVENT } from "@/lib/a11y";

/** Botão de acessibilidade da tela de entrada (sem login): abre a janela de Acessibilidade. `className` define a posição. */
export function A11yButton({ className = "" }: { className?: string }) {
  const tx = useTranslations("components.DesktopBoard");
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(A11Y_OPEN_EVENT))}
      aria-label={tx("acessibilidade")}
      title={tx("acessibilidade")}
      className={`inline-flex h-[2.7em] cursor-pointer items-center gap-[0.5em] rounded-xl bg-gradient-to-b from-[#ffd75e] to-[#f5a50f] px-[0.9em] text-[0.9em] font-bold whitespace-nowrap text-[#2a1c12] shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.55)] ring-1 ring-[#e39a0b]/60 transition hover:brightness-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd] ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-[1.25em]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="4.5" r="1.8" />
        <path d="M5 8.5c2.3.9 4.7 1.3 7 1.3s4.7-.4 7-1.3M12 9.8V14m0 0-3 6m3-6 3 6" />
      </svg>
      <span>{tx("acessibilidade")}</span>
    </button>
  );
}
