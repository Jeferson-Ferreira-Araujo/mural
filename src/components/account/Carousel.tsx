"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/** Carrossel simples: um item por vez, desliza com o dedo (ou pelas setas), com pontinhos embaixo. */
export function Carousel({ children, label }: { children: ReactNode; label: string }) {
  const slides = Children.toArray(children);
  const n = slides.length;
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);

  const go = useCallback((k: number, smooth = true) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: k * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // some um item (aprovou/recusou): não deixa o índice passar do fim
  useEffect(() => {
    if (n > 0 && i > n - 1) {
      setI(n - 1);
      go(n - 1, false);
    }
  }, [n, i, go]);

  if (n === 0) return null;
  const arrow = "grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-[#d9c9ad] bg-white/80 text-xl text-[#2f2218] transition hover:bg-white active:scale-95 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div role="region" aria-roledescription="carrossel" aria-label={label}>
      <div className="flex items-center gap-2">
        {n > 1 && (
          <button type="button" aria-label="Anterior" disabled={i <= 0} onClick={() => go(i - 1)} className={`${arrow} max-sm:hidden`}>
            ‹
          </button>
        )}
        <div
          ref={ref}
          onScroll={(e) => {
            const el = e.currentTarget;
            const k = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
            if (k !== i) setI(k);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" && i < n - 1) go(i + 1);
            if (e.key === "ArrowLeft" && i > 0) go(i - 1);
          }}
          tabIndex={0}
          className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]"
        >
          {slides.map((s, k) => (
            <div key={k} role="group" aria-roledescription="item" aria-label={`${k + 1} de ${n}`} className="w-full shrink-0 snap-center px-1">
              {s}
            </div>
          ))}
        </div>
        {n > 1 && (
          <button type="button" aria-label="Próximo" disabled={i >= n - 1} onClick={() => go(i + 1)} className={`${arrow} max-sm:hidden`}>
            ›
          </button>
        )}
      </div>
      {n > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2" aria-hidden>
          {slides.map((_, k) => (
            <button key={k} type="button" tabIndex={-1} onClick={() => go(k)} className={`h-2 cursor-pointer rounded-full transition-all ${k === i ? "w-5 bg-[#1f232b]" : "w-2 bg-[#d9c9ad]"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
