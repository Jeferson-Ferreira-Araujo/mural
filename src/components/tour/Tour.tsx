"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useBackClose } from "@/lib/backStack";
import { TOUR_STEPS, type TourStep } from "./steps";

const PAD = 8;

/** Primeiro elemento visível que casa com o seletor (o celular e o desktop podem ter o mesmo atalho; só um aparece). */
function findVisible(sel: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/**
 * Tour guiado: escurece a tela, destaca um elemento por vez e mostra um cartão curto. Passos cujo elemento não está na tela são pulados.
 * No celular o cartão fica em cima ou embaixo (do lado oposto ao destaque); no computador, ao lado do destaque.
 */
export function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const card = useRef<HTMLDivElement>(null);
  useBackClose(open, onClose);

  // ao abrir: só os passos que existem nesta tela
  useEffect(() => {
    if (!open) return;
    setSteps(TOUR_STEPS.filter((s) => !s.sel || findVisible(s.sel)));
    setI(0);
    setPos(null);
  }, [open]);

  const step = steps[i];
  const measure = useCallback(() => {
    setVp((v) => (v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight }));
    const el = step?.sel ? findVisible(step.sel) : null;
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const t = window.setInterval(measure, 300); // o mural pode se mexer (animações, carregamento)
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("resize", measure);
    };
  }, [open, measure]);

  // posição do cartão
  useLayoutEffect(() => {
    if (!open || !step || !card.current) return;
    const cw = card.current.offsetWidth;
    const ch = card.current.offsetHeight;
    const { w, h } = vp;
    const m = 12;
    const set = (left: number, top: number) => setPos((p) => (p && Math.abs(p.left - left) < 1 && Math.abs(p.top - top) < 1 ? p : { left, top }));
    if (!rect) return set((w - cw) / 2, (h - ch) / 2);
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (w < 700) return set((w - cw) / 2, cy > h / 2 ? m + 4 : h - ch - m - 4);
    const left = Math.min(Math.max(m, cx - cw / 2), w - cw - m);
    const below = rect.bottom + PAD + m;
    const above = rect.top - PAD - m - ch;
    if (below + ch <= h - m) return set(left, below);
    if (above >= m) return set(left, above);
    set((w - cw) / 2, cy > h / 2 ? m : h - ch - m); // destaque grande: cartão no lado oposto
  }, [open, step, rect, vp]);

  const next = useCallback(() => (i >= steps.length - 1 ? onClose() : setI(i + 1)), [i, steps.length, onClose]);
  const prev = useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, next, prev, onClose]);

  if (!open || !step) return null;
  const last = i === steps.length - 1;
  const btn = "cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";

  return (
    <div className="fixed inset-0 z-[2000]" role="dialog" aria-modal="true" aria-label="Tour pelo Pinz">
      {/* bloqueia toques no mural durante o tour */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-2xl ring-2 ring-[#f2c230] transition-all duration-300"
          style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, boxShadow: "0 0 0 100vmax rgba(10,6,2,.72)" }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[#0a0602]/70" />
      )}
      <div
        ref={card}
        className="absolute w-[min(92vw,22rem)] rounded-2xl border border-[#e6d8bd] bg-[#fbf6ea] p-4 text-[#2f2218] shadow-[0_1rem_3rem_rgba(0,0,0,.55)]"
        style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
      >
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-[#e6d8bd]" aria-hidden>
          <div className="h-full rounded-full bg-[#d9a21b] transition-all" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
        </div>
        <p className="text-[11px] font-bold tracking-wide text-[#8a7b69] uppercase">
          {i + 1} de {steps.length}
        </p>
        <h2 className="font-title mt-0.5 text-lg leading-tight font-semibold">{step.title}</h2>
        <p className="mt-1 text-[15px] leading-snug text-[#4a3826]">{step.text}</p>
        {step.chips && (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {step.chips.map((c) => (
              <li key={c} className="rounded-lg bg-[#f1e7d2] px-2 py-1 text-[13px] font-semibold">
                {c}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3.5 flex items-center gap-2">
          {!last && (
            <button type="button" onClick={onClose} className={`${btn} px-2 text-[#6b5440] underline-offset-2 hover:underline`}>
              Pular
            </button>
          )}
          <span className="flex-1" />
          {i > 0 && (
            <button type="button" onClick={prev} className={`${btn} border border-[#d9c9ad] bg-white/70 text-[#4a3826] hover:bg-white`}>
              Voltar
            </button>
          )}
          <button type="button" onClick={next} autoFocus className={`${btn} bg-[#d9a21b] text-[#2a1c12] hover:bg-[#e6ae22]`}>
            {last ? "Concluir" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  );
}
