"use client";

import { useEffect, useState } from "react";
import { useLit } from "@/i18n/literal";

/**
 * Coluna bege do desktop (com login): quando o conteúdo passa da altura da tela, uma seta no rodapé avisa que há mais opções para baixo
 * (igual ao menu do celular). Clicar rola a coluna; a seta some quando se chega ao fim.
 */
export function SidebarMore() {
  const tl = useLit();
  const [more, setMore] = useState(false);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>("aside");
    if (!el) return;
    const check = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 12);
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: true });
    const timer = window.setTimeout(check, 600);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
      mo.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  if (!more) return null;
  return (
    <div className="pointer-events-none sticky bottom-0 z-10 !max-w-none h-0 shrink-0">
      <div className="absolute inset-x-[-1.6em] bottom-[-1.1em] flex h-[5.5em] items-end justify-center bg-gradient-to-t from-[#f2e8d3] via-[#f2e8d3]/90 to-transparent pb-[1.2em]">
        <button
          type="button"
          onClick={() => {
            const el = document.querySelector<HTMLElement>("aside");
            el?.scrollBy({ top: Math.max(160, el.clientHeight * 0.7), behavior: "smooth" });
          }}
          aria-label={tl("Ver mais opções")}
          title={tl("Ver mais opções")}
          className="pointer-events-auto grid size-[2.4em] cursor-pointer place-items-center rounded-full border border-[#d9c9ad] bg-white/85 text-[#6b5440] shadow-[0_0.2em_0.7em_rgba(60,35,10,.25)] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-[#d98a2b]"
        >
          <svg viewBox="0 0 24 24" className="size-[1.3em] animate-bounce" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
