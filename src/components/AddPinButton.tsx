
"use client";

import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

/** Evento que pede ao mural visível para escolher um ponto livre e abrir o compositor (Pins e Displays), sem precisar tocar no mural. */
export const COMPOSE_AUTO_EVENT = "pinz:compose-auto";

/**
 * Botão redondo com um pin e um "+": abre a janela de Pins e Displays para o dono colocar algo novo no mural.
 * O ponto vem sozinho (o espaço livre mais perto do centro do mural); para escolher o ponto, é só clicar duas vezes (ou segurar) no mural.
 */
export function AddPinButton({ className = "", visitor = false, label = false }: { className?: string; /** desktop: escreve "Adicionar PIN" com o ícone à direita */ label?: boolean; /** visita no mural de outra pessoa: só pins (sem displays) */ visitor?: boolean }) {
  const tx = useTranslations("components.AddPinButton");
  const tl = useLit();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(COMPOSE_AUTO_EVENT))}
      aria-label={visitor ? tx("m_deixarUmPinNesteMural") : tx("m_colocarUmPinOuUm")}
      data-tour="add"
      title={visitor ? tx("m_deixarUmPin") : tx("m_colocarUmPinOuDisplay")}
      className={`pointer-events-auto ${label ? "inline-flex h-12 items-center gap-2.5 pr-3.5 pl-5 text-base font-bold whitespace-nowrap" : "grid size-12 place-items-center"} shrink-0 cursor-pointer rounded-xl bg-gradient-to-b from-[#ffd75e] to-[#f5a50f] ring-1 ring-[#e39a0b]/60 text-[#2a1c12] shadow-[0_0.2rem_0.6rem_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.55)] transition hover:brightness-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd] ${className}`}
    >
      {label && tl("Adicionar PIN")}
      <svg viewBox="0 0 28 28" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {/* tachinha */}
        <g transform="translate(1 4) scale(.85)">
          <path d="M12 17v5" />
          <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
        </g>
        {/* + */}
        <path d="M22.5 3.5v6M19.5 6.5h6" strokeWidth="2.4" />
      </svg>
    </button>
  );
}
