"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  const bar = useRef<HTMLDivElement>(null);

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

  const shown = open && !path?.startsWith("/admin");
  // a barra empurra o site para cima (ver globals.css) e, ao sumir, o site volta à altura normal
  useEffect(() => {
    const el = bar.current;
    const root = document.documentElement;
    if (!shown || !el) return;
    const apply = () => {
      root.style.setProperty("--consent-h", `${el.offsetHeight}px`);
      root.dataset.consent = "1";
      window.dispatchEvent(new Event("resize"));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      delete root.dataset.consent;
      root.style.removeProperty("--consent-h");
      window.dispatchEvent(new Event("resize"));
    };
  }, [shown]);

  if (!open || path?.startsWith("/admin")) return null;
  const choose = (yes: boolean) => {
    setConsent(yes);
    setOpen(false);
  };
  const btn = "cursor-pointer rounded-md border border-[#d9c9ad] bg-white px-3 py-1 text-xs font-bold text-[#2a1c12] transition hover:bg-[#efe4cf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";
  return (
    <div ref={bar} role="dialog" aria-modal="false" aria-label={tl("Privacidade e cookies")} className="fixed inset-x-0 bottom-0 z-[500] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-[#e1d3ba] bg-[#fffaf0] px-4 py-1.5 shadow-[0_-0.3rem_1rem_rgba(0,0,0,.2)]">
      <p className="min-w-[16rem] flex-1 text-[0.72rem] leading-tight text-[#4a3826]">
        {tl("O PINZ utiliza apenas o armazenamento necessário para garantir o funcionamento do site e salvar suas preferências. Com sua autorização, também coletamos dados anônimos de uso para melhorar sua experiência.")}{" "}
        {tl("Sem anúncios, sem rastreamento de terceiros e com respeito à sua privacidade.")}{" "}
        <Link href="/privacidade" className="font-semibold whitespace-nowrap underline">
          {tl("Política de Privacidade")}
        </Link>
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => choose(true)} className={btn}>
          {tl("Aceitar")}
        </button>
        <button type="button" onClick={() => choose(false)} className={btn}>
          {tl("Apenas o essencial")}
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
