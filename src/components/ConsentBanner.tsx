"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getConsent, OPEN_CONSENT_EVENT, setConsent } from "@/lib/consent";
import { useLit } from "@/i18n/literal";

/**
 * Aviso de privacidade: aparece na primeira visita (e quando a pessoa pede para mudar a escolha).
 * Os dois botões (Aceitar e Recusar) têm o mesmo peso. Recusar não tira nada do site: só desliga as métricas de uso.
 */
export function ConsentBanner() {
  const tl = useLit();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(getConsent() === null);
    const h = () => setOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, h);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, h);
  }, []);

  if (!open || path?.startsWith("/admin")) return null;
  const choose = (yes: boolean) => {
    setConsent(yes);
    setOpen(false);
  };
  const btn = "cursor-pointer rounded-xl border border-[#d9c9ad] bg-white px-4 py-2.5 text-sm font-bold text-[#2a1c12] transition hover:bg-[#efe4cf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";
  return (
    <div role="dialog" aria-modal="false" aria-label={tl("Privacidade e cookies")} className="fixed inset-x-3 bottom-3 z-[500] mx-auto max-w-xl rounded-2xl border border-[#e1d3ba] bg-[#fffaf0] p-4 shadow-2xl sm:bottom-4">
      <p className="font-title text-base font-semibold">{tl("Privacidade e cookies")}</p>
      <p className="mt-1 text-sm leading-snug text-[#4a3826]">
        {tl("Usamos só o armazenamento essencial para o site funcionar (login, idioma e acessibilidade). Se você deixar, também medimos o uso do site de forma anônima, com ferramentas próprias, para melhorar o Pinz. Não usamos publicidade nem rastreadores de terceiros.")}{" "}
        <Link href="/privacidade" className="font-semibold underline">
          {tl("Política de Privacidade")}
        </Link>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => choose(false)} className={btn}>
          {tl("Recusar")}
        </button>
        <button type="button" onClick={() => choose(true)} className={btn}>
          {tl("Aceitar")}
        </button>
      </div>
    </div>
  );
}

/** Botão para reabrir a escolha (páginas legais e perfil). */
export function ConsentLink({ className }: { className?: string }) {
  const tl = useLit();
  return (
    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_CONSENT_EVENT))} className={className ?? "cursor-pointer font-semibold underline"}>
      {tl("Mudar minhas escolhas de privacidade")}
    </button>
  );
}
