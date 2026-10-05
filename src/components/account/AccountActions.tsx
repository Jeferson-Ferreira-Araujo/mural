"use client";

import Link from "next/link";
import { loginUrl } from "@/lib/auth";

export type AccountApi = { onSearch: () => void; onMenu: () => void; /** leva ao próprio mural */ onHome?: () => void; badge?: number };

const base = "relative grid h-11 min-w-11 shrink-0 cursor-pointer place-items-center rounded-full transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";

/** Ícones do cabeçalho de quem está logado: pesquisar murais e abrir o menu da conta. `tone`: light = fundo claro; dark = sobre a imagem do mural. */
export function AccountActions({ account, tone = "light", className = "" }: { account: AccountApi; tone?: "light" | "dark"; className?: string }) {
  const look = tone === "dark" ? "bg-[#fbf6ea] text-[#2a1c12] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.3)] hover:bg-white" : "border border-[#d9c9ad] bg-white/60 text-[#2a1c12] hover:bg-white";
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button type="button" onClick={account.onSearch} aria-label="Procurar usuário" className={`${base} grid-flow-col gap-2 px-4 text-sm font-semibold ${look}`}>
        <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4.2-4.2" />
        </svg>
        Procurar usuário
      </button>
      <button type="button" onClick={account.onMenu} aria-label={account.badge ? `Menu (${account.badge} pins para aprovar)` : "Menu"} title="Menu" className={`${base} ${look}`}>
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        {!!account.badge && (
          <span aria-hidden className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-[#d98a2b] px-1 text-[11px] leading-5 font-bold text-white">
            {account.badge}
          </span>
        )}
      </button>
    </div>
  );
}

const iconBtn = "relative grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-[#d9c9ad] bg-white/60 text-[#2a1c12] transition hover:bg-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";
const iconSvg = { viewBox: "0 0 24 24", className: "size-5", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

/** Cabeçalho do mural no celular: à esquerda a lousa (volta ao seu mural) e a lupa (abre a busca), à direita o menu. O logo fica no meio (quem usa). */
export function MobileHeaderLeft({ account }: { account: AccountApi }) {
  return (
    <div className="flex items-center gap-1.5">
      {account.onHome && (
        <button type="button" onClick={account.onHome} aria-label="Ir para o meu mural" title="Meu mural" className={iconBtn}>
          <svg {...iconSvg}>
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5.5 10v9.5a1 1 0 0 0 1 1H10v-5.5h4v5.5h3.5a1 1 0 0 0 1-1V10" />
          </svg>
        </button>
      )}
      <button type="button" onClick={account.onSearch} aria-label="Procurar usuário" title="Procurar usuário" className={iconBtn}>
        <svg {...iconSvg} strokeWidth={2.4}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4.2-4.2" />
        </svg>
      </button>
    </div>
  );
}

export function MobileHeaderRight({ account }: { account: AccountApi }) {
  return (
    <button type="button" onClick={account.onMenu} aria-label={account.badge ? `Menu (${account.badge} pins para aprovar)` : "Menu"} title="Menu" className={iconBtn}>
      <svg {...iconSvg} className="size-6" strokeWidth={2.4}>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
      {!!account.badge && (
        <span aria-hidden className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-[#d98a2b] px-1 text-[11px] leading-5 font-bold text-white">
          {account.badge}
        </span>
      )}
    </button>
  );
}

/** Quem chegou por link e ainda não tem conta: Entrar / Criar conta (voltam para este mural). */
export function GuestLinks({ next, className = "" }: { next: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Link href={loginUrl(next)} className="rounded-full border border-[#d9c9ad] bg-white/70 px-4 py-2 text-sm font-semibold text-[#2f2218] transition hover:bg-white">
        Entrar
      </Link>
      <Link href={loginUrl(next, true)} className="rounded-full bg-[#1f232b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2c313b]">
        Criar conta
      </Link>
    </div>
  );
}
