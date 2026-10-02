"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth";

/**
 * Entrada de quem já tem conta: "Entrar no meu mural" (abre direto na aba Entrar) ou, se já está logado, "Meu mural" (painel).
 * `tone`: light = barra bege do desktop; dark = celular.
 */
export function MyMuralLink({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  const { session, loading } = useSession();
  const look =
    tone === "dark"
      ? "border border-white/15 bg-[#1c1510]/70 text-white backdrop-blur hover:bg-[#2a1f16]/80"
      : "border border-[#d9c9ad] bg-white/60 text-[#2f2218] hover:bg-white";

  return (
    <Link
      href={session ? "/painel" : "/entrar?modo=entrar"}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-[0.5em] rounded-[0.9em] px-[1em] py-[0.7em] text-[0.95em] font-semibold whitespace-nowrap transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${look} ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-[1.15em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10" transform="rotate(180 12 12)" />
      </svg>
      {session ? "Meu mural" : "Entrar no meu mural"}
    </Link>
  );
}
