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
  const [left, setLeft] = useState(0);

  useEffect(() => {
    // na primeira visita espera a abertura animada do logo terminar (o <html> perde data-intro); a trava evita ficar escondido para sempre
    const root = document.documentElement;
    const show = () => setOpen(true);
    let obs: MutationObserver | undefined;
    let timer: number | undefined;
    if (getConsent() === null) {
      if (root.dataset.intro === "play") {
        obs = new MutationObserver(() => {
          if (root.dataset.intro !== "play") {
            obs?.disconnect();
            show();
          }
        });
        obs.observe(root, { attributes: true, attributeFilter: ["data-intro"] });
        timer = window.setTimeout(() => {
          obs?.disconnect();
          show();
        }, 5000);
      } else show();
    }
    window.addEventListener(OPEN_CONSENT_EVENT, show);
    return () => {
      obs?.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener(OPEN_CONSENT_EVENT, show);
    };
  }, []);

  // no computador a barra fica só sobre o mural: começa onde termina a coluna bege (que pode estar recolhida)
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const side = document.querySelector("aside");
      const r = side?.getBoundingClientRect();
      const visible = !!r && getComputedStyle(side!).visibility !== "hidden" && r.width < window.innerWidth * 0.6;
      setLeft(visible ? Math.max(0, Math.round(r!.right)) : 0);
    };
    measure();
    const id = window.setInterval(measure, 300);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  if (!open || path?.startsWith("/admin")) return null;
  const choose = (yes: boolean) => {
    setConsent(yes);
    setOpen(false);
  };
  const btn = "cursor-pointer rounded-md border border-[#d9c9ad] bg-white px-2.5 py-1 text-xs font-bold text-[#2a1c12] transition hover:bg-[#efe4cf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";
  return (
    <div role="dialog" aria-modal="false" aria-label={tl("Privacidade e cookies")} style={{ left: left + 8 }} className="fixed right-2 bottom-2 z-[500] flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-[#e1d3ba] bg-[#fffaf0] px-2.5 py-1.5 shadow-xl sm:right-[4.5rem]">
      <p className="min-w-[14rem] flex-1 text-[0.62rem] leading-tight text-[#4a3826]">
        {tl("Usamos só o armazenamento essencial para o site funcionar (login, idioma e acessibilidade). Se você deixar, também medimos o uso do site de forma anônima, com ferramentas próprias, para melhorar o Pinz. Não usamos publicidade nem rastreadores de terceiros.")}{" "}
        <Link href="/privacidade" className="font-semibold whitespace-nowrap underline">
          {tl("Política de Privacidade")}
        </Link>
      </p>
      <div className="ml-auto flex gap-2">
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
