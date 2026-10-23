"use client";

import { useEffect, useRef } from "react";

/**
 * Carrossel de estilos de um pacote de display: desliza com o dedo (ou com as setas) e para sempre em um estilo.
 * `index` é o estilo à vista; mudar de slide chama `onIndex`.
 */
export function StyleCarousel({ count, index, onIndex, slide, label, names }: { count: number; index: number; onIndex: (i: number) => void; slide: (i: number) => React.ReactNode; label: string; /** nome de cada estilo (para os pontinhos) */ names: string[] }) {
  const box = useRef<HTMLDivElement>(null);
  const programmatic = useRef(false);

  // índice vindo de fora (setas, pontinhos): rola até o slide
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const target = index * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) < 2) return;
    programmatic.current = true;
    el.scrollTo({ left: target, behavior: "smooth" });
    const t = window.setTimeout(() => (programmatic.current = false), 450);
    return () => window.clearTimeout(t);
  }, [index]);

  function onScroll() {
    const el = box.current;
    if (!el || programmatic.current || !el.clientWidth) return;
    const i = Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / el.clientWidth)));
    if (i !== index) onIndex(i);
  }

  const arrow = "absolute top-1/2 z-10 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/90 text-[#4a3826] shadow-md transition hover:bg-white active:scale-95 disabled:pointer-events-none disabled:opacity-0";
  return (
    <div role="group" aria-roledescription="carousel" aria-label={label} className="relative">
      <div ref={box} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} / ${count}`} className="w-full shrink-0 snap-center snap-always">
            {slide(i)}
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          <button type="button" aria-label="‹" disabled={index === 0} onClick={() => onIndex(index - 1)} className={`${arrow} left-1.5`}>
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
          <button type="button" aria-label="›" disabled={index === count - 1} onClick={() => onIndex(index + 1)} className={`${arrow} right-1.5`}>
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
          <div className="mt-2 flex justify-center gap-1.5">
            {names.map((n, i) => (
              <button key={i} type="button" aria-label={n} aria-current={i === index} onClick={() => onIndex(i)} className={`h-2 cursor-pointer rounded-full transition-all ${i === index ? "w-5 bg-[#1f232b]" : "w-2 bg-[#cdb98f]"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
