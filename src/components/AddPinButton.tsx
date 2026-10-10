"use client";

/** Evento que pede ao mural visível para escolher um ponto livre e abrir o compositor (Pins e Displays), sem precisar tocar no mural. */
export const COMPOSE_AUTO_EVENT = "pinz:compose-auto";

/**
 * Botão redondo com um pin e um "+": abre a janela de Pins e Displays para o dono colocar algo novo no mural.
 * O ponto vem sozinho (o espaço livre mais perto do centro do mural); para escolher o ponto, é só clicar duas vezes (ou segurar) no mural.
 */
export function AddPinButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(COMPOSE_AUTO_EVENT))}
      aria-label="Colocar um pin ou um display no mural"
      title="Colocar um pin ou display"
      className={`pointer-events-auto grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-[#d9a21b] text-[#2a1c12] shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] transition hover:bg-[#e6ae22] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd] ${className}`}
    >
      <svg viewBox="0 0 28 28" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {/* tachinha */}
        <path d="M10 4.5h8l-1.2 6.2c2.2 1 3.7 2.6 3.7 4.8H7.5c0-2.2 1.5-3.8 3.7-4.8L10 4.5Z" />
        <path d="M14 15.5v6.5" />
        {/* + */}
        <path d="M21.5 4.5v6M18.5 7.5h6" strokeWidth="2.4" />
      </svg>
    </button>
  );
}
