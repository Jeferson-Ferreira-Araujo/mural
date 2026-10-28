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
  const [policy, setPolicy] = useState(false);
  const framed = typeof window !== "undefined" && window.self !== window.top; // dentro do modal da política: não repete o aviso

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

  const shown = open && !framed && !path?.startsWith("/admin");
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

  useEffect(() => {
    if (!policy) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setPolicy(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [policy]);

  if (framed || !open || path?.startsWith("/admin")) return null;
  const choose = (yes: boolean) => {
    setConsent(yes);
    setOpen(false);
  };
  const btn = "cursor-pointer rounded-md border border-[#17110c] bg-[#2a1c12] px-3 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-[#17110c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";
  return (
    <>
      <div ref={bar} role="dialog" aria-modal="false" aria-label={tl("Privacidade e cookies")} className="fixed inset-x-0 bottom-0 z-[500] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-[#e1d3ba] bg-[#fffaf0] px-4 py-1.5 shadow-[0_-0.3rem_1rem_rgba(0,0,0,.2)]">
        <p className="min-w-[16rem] flex-1 text-[0.72rem] leading-tight text-[#4a3826]">
          {tl("O PINZ utiliza apenas o armazenamento necessário para garantir o funcionamento do site e salvar suas preferências. Com sua autorização, também coletamos dados anônimos de uso para melhorar sua experiência.")}{" "}
          {tl("Sem anúncios, sem rastreamento de terceiros e com respeito à sua privacidade.")}{" "}
          <Link
            href="/privacidade"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              setPolicy(true);
            }}
            className="font-semibold whitespace-nowrap underline"
          >
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
      {policy && (
        <div className="fixed inset-0 z-[600] grid place-items-center bg-black/60 p-3" onClick={() => setPolicy(false)}>
          <div role="dialog" aria-modal="true" aria-label={tl("Política de Privacidade")} onClick={(e) => e.stopPropagation()} className="relative flex h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[#fffaf0] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-[#e1d3ba] px-5 py-3">
              <h2 className="font-title text-xl font-semibold text-[#2a1c12]">{tl("Política de Privacidade")}</h2>
              <button type="button" onClick={() => setPolicy(false)} aria-label={tl("Fechar")} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-[#4a3826] transition hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <iframe src="/privacidade/embed" title={tl("Política de Privacidade")} className="min-h-0 w-full flex-1 border-0" />
          </div>
        </div>
      )}
    </>
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
