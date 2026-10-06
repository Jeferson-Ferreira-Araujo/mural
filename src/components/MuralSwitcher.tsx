"use client";

export type MuralChoice = { slug: string; title: string };
export type MuralSwitch = { items: MuralChoice[]; current: string; onSelect: (slug: string) => void };

/** Rodapé do mural: os murais da pessoa, com setas para passar de um para o outro. Só aparece quando ela tem mais de um. */
export function MuralSwitcher({ sw, className = "" }: { sw?: MuralSwitch; className?: string }) {
  if (!sw || sw.items.length < 2) return null;
  const i = Math.max(0, sw.items.findIndex((m) => m.slug === sw.current));
  const go = (k: number) => sw.onSelect(sw.items[(k + sw.items.length) % sw.items.length].slug);
  const arrow = "grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-xl text-white transition hover:bg-white/15 active:scale-95";
  return (
    <nav aria-label="Murais desta pessoa" className={`flex w-[min(24rem,100%)] items-center justify-between gap-1 rounded-xl border border-white/15 bg-[#1c1510]/80 px-1.5 py-1 text-white shadow-[0_0.5rem_1.4rem_rgba(0,0,0,.4)] backdrop-blur-md ${className}`}>
      <button type="button" aria-label="Mural anterior" onClick={() => go(i - 1)} className={arrow}>
        ‹
      </button>
      <p className="min-w-0 flex-1 text-center">
        <span className="block truncate text-sm font-semibold">{sw.items[i].title}</span>
        <span className="flex justify-center gap-1.5 pt-0.5" aria-hidden>
          {sw.items.map((m, k) => (
            <span key={m.slug} className={`h-1.5 rounded-full transition-all ${k === i ? "w-4 bg-[#d9a21b]" : "w-1.5 bg-white/35"}`} />
          ))}
        </span>
        <span className="sr-only">
          {i + 1} de {sw.items.length}
        </span>
      </p>
      <button type="button" aria-label="Próximo mural" onClick={() => go(i + 1)} className={arrow}>
        ›
      </button>
    </nav>
  );
}

/** Passador de murais: rótulo "Murais" em cima e, embaixo, setas com o número do mural atual ("1/2"). Só aparece com mais de um mural. */
export function MuralPager({ sw, className = "", tone = "light" }: { sw?: MuralSwitch; className?: string; tone?: "light" | "dark" }) {
  if (!sw || sw.items.length < 2) return null;
  const i = Math.max(0, sw.items.findIndex((m) => m.slug === sw.current));
  const go = (k: number) => sw.onSelect(sw.items[(k + sw.items.length) % sw.items.length].slug);
  const dark = tone === "dark";
  const arrow = `grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg transition active:scale-90 ${dark ? "bg-white/15 text-white hover:bg-white/25" : "bg-[#2a1c12] text-[#f7f0dd] hover:bg-[#46301f]"}`;
  const chevron = (d: string) => (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
  return (
    <nav aria-label="Murais desta pessoa" className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl px-2.5 py-1 ${dark ? "text-white" : "bg-white/55 text-[#2a1c12] shadow-[inset_0_0_0_1px_rgba(120,90,50,.25)]"} ${className}`}>
      <span className={`text-[10px] leading-none font-bold tracking-[0.14em] uppercase ${dark ? "text-white/70" : "text-[#8a6a2a]"}`}>Murais</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Mural anterior" onClick={() => go(i - 1)} className={arrow}>
          {chevron("m15 5-7 7 7 7")}
        </button>
        <span className="min-w-[2.4em] text-center text-base leading-none font-bold tabular-nums" aria-label={`Mural ${i + 1} de ${sw.items.length}`}>
          {i + 1}/{sw.items.length}
        </span>
        <button type="button" aria-label="Próximo mural" onClick={() => go(i + 1)} className={arrow}>
          {chevron("m9 5 7 7-7 7")}
        </button>
      </div>
    </nav>
  );
}
