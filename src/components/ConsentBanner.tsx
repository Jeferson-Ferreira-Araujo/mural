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
  const [box, setBox] = useState<{ left: number; width?: number }>({ left: 8 });

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
      const l = (visible ? Math.max(0, Math.round(r!.right)) : 0) + 8;
      if (window.innerWidth < 640) return setBox({ left: l });
      // computador: 70% do espaço livre do mural (sem a coluna bege nem os botões da direita), centralizada nele
      const avail = window.innerWidth - l - 72;
      const w = Math.round(avail * 0.7);
      setBox({ left: l + Math.round((avail - w) / 2), width: w });
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
  const btn = "cursor-pointer rounded-md border border-[#d9c9ad] bg-white px-3.5 py-1.5 text-sm font-bold text-[#2a1c12] transition hover:bg-[#efe4cf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";
  return (
    <div role="dialog" aria-modal="false" aria-label={tl("Privacidade e cookies")} style={{ left: box.left, width: box.width }} className="fixed right-2 bottom-2 z-[500] flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-[#e1d3ba] bg-[#fffaf0] px-3 py-2 shadow-xl">
      <p className="min-w-[14rem] flex-1 text-[0.8rem] leading-snug text-[#4a3826]">
        {tl("O PINZ utiliza apenas o armazenamento necessário para garantir o funcionamento do site e salvar suas preferências. Com sua autorização, também coletamos dados anônimos de uso para melhorar sua experiência.")}
        <span className="mt-1 block">
          {tl("Sem anúncios, sem rastreamento de terceiros e com respeito à sua privacidade.")}{" "}
          <Link href="/privacidade" className="font-semibold whitespace-nowrap underline">
            {tl("Política de Privacidade")}
          </Link>
        </span>
      </p>
      <div className="ml-auto flex gap-2">
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
