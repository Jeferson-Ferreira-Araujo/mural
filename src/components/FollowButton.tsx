"use client";

import type { ViewProps } from "./viewProps";

/** Seguir / Seguindo (estrela): acesso rápido ao mural da pessoa pelo menu "Seguindo". */
export function FollowButton({ follow, compact = false, glass = false, className = "" }: { follow: NonNullable<ViewProps["follow"]>; compact?: boolean; /** sobre o quadro (celular): fundo escuro translúcido, igual aos botões Aproximar e Compartilhar */ glass?: boolean; className?: string }) {
  const on = follow.following;
  return (
    <button
      type="button"
      onClick={follow.onToggle}
      disabled={follow.busy}
      aria-pressed={on}
      aria-label={on ? "Deixar de seguir" : "Seguir"}
      title={on ? "Seguindo (toque para deixar de seguir)" : "Seguir"}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl font-semibold transition active:scale-95 disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${compact ? "h-9 px-3 text-sm" : "h-11 px-4 text-sm"} ${glass ? (on ? "bg-[#f4c542] text-[#2a1c12] shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)]" : "bg-[#17110c]/85 text-white shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur") : on ? "bg-[#f4c542] text-[#2a1c12]" : "border border-[#d9c9ad] bg-[#fbf6ea] text-[#2a1c12] hover:bg-white"} ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-4.5" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
      </svg>
      {on ? "Seguindo" : "Seguir"}
    </button>
  );
}
