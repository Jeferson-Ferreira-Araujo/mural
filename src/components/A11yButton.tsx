"use client";

import { useTranslations } from "next-intl";
import { A11Y_OPEN_EVENT } from "@/lib/a11y";

/** Botão de acessibilidade da tela de entrada (sem login): redondo, só com o desenho, como no celular. Abre a janela de Acessibilidade. `className` define a posição. */
export function A11yButton({ className = "" }: { className?: string }) {
  const tx = useTranslations("components.DesktopBoard");
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(A11Y_OPEN_EVENT))}
      aria-label={tx("acessibilidade")}
      className={`grid size-[2.5em] cursor-pointer place-items-center rounded-full bg-[#17110c]/80 text-white shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.35)] backdrop-blur transition hover:bg-[#17110c] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-[1.35em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="4.5" r="1.8" />
        <path d="M5 8.5c2.3.9 4.7 1.3 7 1.3s4.7-.4 7-1.3M12 9.8V14m0 0-3 6m3-6 3 6" />
      </svg>
    </button>
  );
}
