"use client";

import { useEffect, useRef, useState } from "react";
import { boardFull, boardPreview, type BoardInfo } from "@/lib/boards";
import { BoardLightbox } from "../badges/BoardLightbox";
import { useLit } from "@/i18n/literal";

/**
 * Carrossel do tipo de mural (o mesmo do "Novo mural"): o que está à vista é o escolhido; setas, bolinhas e o olho que mostra o quadro em tela cheia.
 * Só entram os tipos que a pessoa já tem (`boards`).
 */
export function BoardCarousel({ boards, value, onChange, label }: { boards: readonly BoardInfo[]; value: string; onChange: (id: string) => void; label: string }) {
  const tl = useLit();
  const strip = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const [viewing, setViewing] = useState<{ image: string; name: string } | null>(null);

  // mudou o escolhido por fora (ou a lista terminou de carregar): o carrossel acompanha
  useEffect(() => {
    const i = Math.max(0, boards.findIndex((b) => b.id === value));
    const el = strip.current;
    if (el && Math.round(el.scrollLeft / (el.clientWidth || 1)) !== i) el.scrollTo({ left: i * el.clientWidth });
    setSlide(i);
  }, [value, boards]);

  return (
    <fieldset className="mx-auto w-full max-w-[26rem] min-w-0">
      <div className="mb-2">
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="relative">
        <div
          ref={strip}
          role="radiogroup"
          aria-label={label}
          onScroll={(e) => {
            const i = Math.round(e.currentTarget.scrollLeft / (e.currentTarget.clientWidth || 1));
            setSlide(i);
            const bd = boards[i];
            if (bd && bd.id !== value) onChange(bd.id);
          }}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl shadow-[0_0.5rem_1.4rem_rgba(60,35,10,.25)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {boards.map((bd) => (
            <div key={bd.id} role="radio" aria-checked={value === bd.id} aria-label={tl(bd.name)} className="relative block w-full shrink-0 snap-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={boardPreview(bd)} alt="" draggable={false} className="aspect-[12/5] w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-3 pt-10 pb-3">
                <span className="min-w-0 truncate text-base font-bold text-white">{tl(bd.name)}</span>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            const bd = boards[slide] ?? boards[0];
            if (bd) setViewing({ image: boardFull(bd), name: tl(bd.name) });
          }}
          aria-label={tl("Ver o mural em tela cheia")}
          title={tl("Ver o mural em tela cheia")}
          className="absolute top-1/2 left-1/2 z-10 grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/55 text-white shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.4)] backdrop-blur transition hover:bg-black/70 active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        {boards.length > 1 &&
          ([-1, 1] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => strip.current?.scrollBy({ left: d * (strip.current?.clientWidth ?? 230), behavior: "smooth" })}
              aria-label={d < 0 ? tl("Tipo anterior") : tl("Próximo tipo")}
              className={`absolute top-1/2 z-10 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/85 text-[#2a1c12] shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.35)] backdrop-blur transition hover:bg-white active:scale-90 ${d < 0 ? "left-2" : "right-2"}`}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={d < 0 ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
              </svg>
            </button>
          ))}
      </div>
      {boards.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5" aria-hidden>
          {boards.map((bd, i) => (
            <span key={bd.id} className={`h-1.5 rounded-full transition-all ${i === slide ? "w-5 bg-[#d9a21b]" : "w-1.5 bg-[#cdbb97]"}`} />
          ))}
        </div>
      )}
      <BoardLightbox image={viewing?.image ?? null} name={viewing?.name ?? ""} onClose={() => setViewing(null)} />
    </fieldset>
  );
}
