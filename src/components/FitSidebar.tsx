"use client";

import { useEffect } from "react";

/**
 * Coluna esquerda do desktop (com ou sem login): se o conteúdo (logo, frase, formulário, números, menu) não cabe na altura do monitor, a letra da coluna inteira
 * diminui aos poucos até tudo caber, sem barra de rolagem. Roda de novo quando a janela muda de tamanho ou o conteúdo muda.
 */
export function FitSidebar() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("aside");
    if (!el) return;
    let raf = 0;
    const fit = () => {
      raf = 0;
      el.style.fontSize = "";
      if (window.matchMedia("(orientation: portrait)").matches) return; // em pé, a coluna vai para cima e tem a própria altura
      let fs = parseFloat(getComputedStyle(el).fontSize) || 14;
      const h0 = el.scrollHeight;
      while (el.scrollHeight > el.clientHeight + 1 && fs > 8.5) {
        fs -= 0.5;
        el.style.fontSize = `${fs}px`;
      }
      // o que sobrou não depende da letra da coluna (ex.: a lista do menu, que rola por dentro): volta ao tamanho normal
      if (el.scrollHeight > el.clientHeight + 1 && el.scrollHeight > h0 - 4) el.style.fontSize = "";
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(fit);
    };
    fit();
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    const mo = new MutationObserver(schedule);
    mo.observe(el, { childList: true, subtree: true });
    void document.fonts?.ready.then(schedule);
    return () => {
      ro.disconnect();
      mo.disconnect();
      if (raf) cancelAnimationFrame(raf);
      el.style.fontSize = "";
    };
  }, []);
  return null;
}
