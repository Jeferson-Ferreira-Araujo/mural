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
      el.style.maxWidth = "";
      if (window.matchMedia("(orientation: portrait)").matches) return; // em pé, a coluna vai para cima e tem a própria altura
      let fs = parseFloat(getComputedStyle(el).fontSize) || 14;
      // a largura máxima (40em) não pode encolher junto com a letra: senão sobra faixa desfocada nas laterais do mural
      el.style.maxWidth = `${fs * 40}px`;
      const h0 = el.scrollHeight;
      const floor = 8.5; // os textos de cada idioma têm a mesma altura, então a letra encolhe igual em qualquer um; sem barra de rolagem
      while (el.scrollHeight > el.clientHeight + 1 && fs > floor) {
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
    // a abertura animada mexe no tamanho das coisas por alguns instantes: confere de novo depois dela, para a letra não ficar menor do que precisa
    const timers = [400, 1200, 2600, 5000].map((ms) => window.setTimeout(schedule, ms));
    window.addEventListener("load", schedule);
    // a abertura animada marca o <html> (data-intro) enquanto toca e ao terminar: confere de novo nos dois momentos
    const mo2 = new MutationObserver(schedule);
    mo2.observe(document.documentElement, { attributes: true, attributeFilter: ["data-intro", "class"] });
    return () => {
      ro.disconnect();
      mo.disconnect();
      mo2.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("load", schedule);
      if (raf) cancelAnimationFrame(raf);
      el.style.fontSize = "";
      el.style.maxWidth = "";
    };
  }, []);
  return null;
}
