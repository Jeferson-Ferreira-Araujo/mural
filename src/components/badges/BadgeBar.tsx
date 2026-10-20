"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BADGES, badgeSrc } from "@/lib/badges";
import { BADGE_CATEGORY, BADGE_CATEGORIES } from "@/lib/badgeCategories";
import { OPEN_REWARDS_EVENT } from "@/lib/rewards";
import { useBadges } from "./BadgeContext";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";


/**
 * Barra de baixo (só para o dono, no próprio mural): os pins decorativos que ele tem, numa faixa que rola na horizontal.
 * Arraste um deles para o mural; solte um que já está no mural sobre esta barra para tirá-lo (a unidade volta).
 * Cada pin tem 1 unidade + as extras compradas (esgota ao colocar, volta ao tirar do mural). Ninguém tem ilimitado. Mais Bottons e unidades: ícone da loja, fixo no início da barra.
 */
export function BadgeBar({ className = "", hideRewards = false }: { className?: string; /** celular: o "Ganhar créditos" fica no menu lateral, não na barra */ hideRewards?: boolean }) {
  const tx = useTranslations("components.badges.BadgeBar");
  const tl = useLit();
  const { editable, begin, stock, openStore, acquiredAt, draggingId, draggingNew } = useBadges();
  const [openCat, setOpenCat] = useState<string | null>(null); // categoria com o painel aberto (abre para cima)
  const box = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState(0); // centro (em px, dentro da barra) do botão de grupo clicado: o painel abre naquela direção
  const toggleCat = (cat: string, el: HTMLElement) => {
    const li = el.closest("li")?.getBoundingClientRect();
    const bx = box.current?.getBoundingClientRect();
    if (li && bx) setAnchor(li.left + li.width / 2 - bx.left);
    setOpenCat((v) => (v === cat ? null : cat));
  };
  // o painel fica centralizado sobre o botão clicado, sem sair da barra
  useLayoutEffect(() => {
    const p = panel.current;
    const bx = box.current;
    if (!openCat || !p || !bx) return;
    p.style.left = `${Math.max(0, Math.min(bx.clientWidth - p.offsetWidth, anchor - p.offsetWidth / 2))}px`;
  }, [openCat, anchor]);
  // começou a arrastar um botton do painel: o painel fecha para o mural ficar à vista
  const wasDragging = useRef(false);
  useEffect(() => {
    if (wasDragging.current && !draggingNew) setOpenCat(null);
    wasDragging.current = draggingNew;
  }, [draggingNew]);
  // tocar fora do painel fecha
  useEffect(() => {
    if (!openCat) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpenCat(null);
    };
    window.addEventListener("pointerdown", away, true);
    return () => window.removeEventListener("pointerdown", away, true);
  }, [openCat]);
  if (!editable) return null;
  // ordem da barra: os que ainda têm unidades vêm primeiro, os de MAIOR quantidade na frente; empate: o comprado mais recentemente primeiro;
  // quem ficou sem unidades vai para o final (continua visível, só apagado)
  const mine = BADGES.filter((b) => stock(b.key).owned).sort((a, b) => {
    const la = stock(a.key).left ?? 0;
    const lb = stock(b.key).left ?? 0;
    if ((la > 0) !== (lb > 0)) return la > 0 ? -1 : 1;
    if (la !== lb) return lb - la;
    return (acquiredAt(b.key) ?? 0) - (acquiredAt(a.key) ?? 0);
  });
  // quem tem mais de um botton da mesma categoria vê só um botão na barra (com uma setinha): ele abre um painel para cima com todos eles.
  // A categoria Aniversário vem sempre primeiro; as demais seguem a posição do primeiro botton delas na barra
  const byCat = new Map<string, typeof mine>();
  for (const b of mine) {
    const c = BADGE_CATEGORY[b.key];
    if (c) byCat.set(c, [...(byCat.get(c) ?? []), b]);
  }
  const groups = [...byCat.entries()].filter(([, l]) => l.length > 1);
  const groupedKeys = new Set(groups.flatMap(([, l]) => l.map((b) => b.key)));
  const plain = mine.filter((b) => !groupedKeys.has(b.key));
  const ordered = [...groups].sort(([ca, la], [cb, lb]) => (ca === "aniversario" ? -1 : cb === "aniversario" ? 1 : mine.indexOf(la[0]) - mine.indexOf(lb[0])));
  const catLabel = (id: string) => tl(BADGE_CATEGORIES.find((c) => c.id === id)?.label ?? id);
  const groupBtn = (cat: string, list: typeof mine) => {
    // sem nenhum disponível (todos já estão no mural): o ícone fica apagado, como os bottons de fora do grupo
    const out = list.every((b) => stock(b.key).left === 0);
    const open = openCat === cat;
    // o botton do grupo aparece como os demais, com um pequeno ícone de grade (quatro quadradinhos) no canto: "ver todos" de uma galeria
    return (
      <li key={`cat-${cat}`} className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => toggleCat(cat, e.currentTarget)}
          aria-expanded={open}
          aria-label={tx("x_openCat", { cat: catLabel(cat), n: list.length })}
          title={tx("x_catTitle", { cat: catLabel(cat), n: list.length })}
          className={`relative grid h-14 w-14 cursor-pointer place-items-center rounded-xl transition hover:bg-white/10 active:scale-95 ${open ? "bg-white/10" : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={badgeSrc(list[0].key)} alt="" draggable={false} className={`max-h-12 max-w-12 select-none transition ${out ? "opacity-30 grayscale" : ""}`} style={{ filter: out ? undefined : "drop-shadow(0 2px 3px rgba(0,0,0,.5))" }} />
          <span aria-hidden className={`pointer-events-none absolute right-0 bottom-0 grid size-[1.15rem] place-items-center rounded-md shadow-[0_0.1rem_0.3rem_rgba(0,0,0,.5)] ${open ? "bg-[#f2c230] text-[#2a1c12]" : "bg-white text-[#2a1c12]"}`}>
            <svg viewBox="0 0 16 16" className="size-3" fill="currentColor">
              <rect x="2" y="2" width="5" height="5" rx="1" />
              <rect x="9" y="2" width="5" height="5" rx="1" />
              <rect x="2" y="9" width="5" height="5" rx="1" />
              <rect x="9" y="9" width="5" height="5" rx="1" />
            </svg>
          </span>
        </button>
      </li>
    );
  };
  const openList = ordered.find(([c]) => c === openCat)?.[1] ?? null;
  const storeBtn = (
        <button type="button" onClick={openStore} data-tour="store" aria-label={tx("lojaDeBottons")} title={tx("loja")} className="flex h-14 w-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl bg-gradient-to-b from-[#ffd75e] to-[#f5a50f] ring-1 ring-[#e39a0b]/60 text-[#2a1c12] shadow-[0_0.2rem_0.6rem_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.55)] transition hover:brightness-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 8h16l-1.2 11.2a1 1 0 0 1-1 .8H6.2a1 1 0 0 1-1-.8L4 8Z" />
            <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
          </svg>
          <span className="text-[11px] leading-none font-bold">{tx("loja")}</span>
        </button>
  );
  const rewardsBtn = (
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_REWARDS_EVENT))} data-tour="rewards" aria-label={tx("ganharCreditos")} title={tx("ganharCreditos")} className="flex h-14 w-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl bg-gradient-to-b from-[#ffd75e] to-[#f5a50f] ring-1 ring-[#e39a0b]/60 text-[#2a1c12] shadow-[0_0.2rem_0.6rem_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.55)] transition hover:brightness-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/moeda.webp" alt="" aria-hidden draggable={false} className="pointer-events-none size-5 select-none object-contain" />
          <span className="text-[11px] leading-none font-bold">{tx("ganhar")}</span>
        </button>
  );
  const strip = (
      <ul className="flex min-w-0 flex-1 gap-2.5 overflow-x-auto overscroll-x-contain pt-1.5 pr-1.5 pb-1 [touch-action:pan-x] [scrollbar-color:rgba(255,255,255,.35)_transparent] [scrollbar-width:thin]">
        {ordered.map(([c, l]) => groupBtn(c, l))}
        {plain.map((b) => {
          const st = stock(b.key);
          const out = st.left === 0;
          return (
            <li key={b.key} className="relative shrink-0">
              <button
                type="button"
                aria-label={out ? tx("m_bottonSemUnidadesDisponiveis", { v0: b.name ? tl(b.name) : b.key }) : tx("m_bottonArrasteParaOMural", { v0: b.name ? tl(b.name) : b.key })}
                onPointerDown={(e) => begin(e.nativeEvent, { kind: "new", key: b.key }, e.currentTarget)}
                onDragStart={(e) => e.preventDefault()}
                className={`grid h-14 w-14 touch-pan-x place-items-center rounded-xl transition ${out ? "cursor-not-allowed" : "cursor-grab hover:bg-white/10 active:cursor-grabbing"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badgeSrc(b.key)} alt="" draggable={false} className={`max-h-12 max-w-12 select-none transition ${out ? "opacity-30 grayscale" : ""}`} style={{ filter: out ? undefined : "drop-shadow(0 2px 3px rgba(0,0,0,.5))" }} />
              </button>
              {/* quantidade que a pessoa ainda tem para colocar */}
              <span
                aria-label={tx("m_disponivel", { v0: st.left ?? 0, v1: st.left === 1 ? "" : "is" })}
                className={`pointer-events-none absolute top-0 right-0 grid min-w-[1.15rem] place-items-center rounded-md px-1 text-[10px] leading-[1.15rem] font-bold text-white shadow-[0_0.1rem_0.3rem_rgba(0,0,0,.45)] ${out ? "bg-[#7a6b5a]" : "bg-[#d98a2b]"}`}
              >
                {st.left ?? 0}
              </span>
            </li>
          );
        })}
      </ul>
  );
  const block = (
    <section ref={box} data-badge-bar data-tour="badges" aria-label={tx("seusBottons")} className={`relative rounded-2xl border border-white/15 bg-[#1c1510]/80 px-3 py-2 text-white shadow-[0_0.6rem_1.6rem_rgba(0,0,0,.45)] backdrop-blur-md ${className}`}>
      {/* painel dos bottons de aniversário: abre para cima da barra; arraste um deles para o mural */}
      {openCat && openList && (
        <div ref={panel} role="dialog" aria-label={catLabel(openCat)} className={`absolute bottom-full left-0 z-30 mb-2 max-h-[46dvh] w-max max-w-full overflow-y-auto rounded-2xl border border-white/15 bg-[#1c1510]/95 p-3 text-white shadow-[0_0.6rem_1.6rem_rgba(0,0,0,.55)] backdrop-blur-md ${draggingNew ? "invisible" : ""}`}>
          <p className="mb-1 px-1 text-sm font-bold">{catLabel(openCat)}</p>
          <ul className="flex flex-wrap gap-1" style={{ maxWidth: "26rem" }}>
            {openList.map((b) => {
              const st = stock(b.key);
              const out = st.left === 0;
              return (
                <li key={b.key} className="relative">
                  <button
                    type="button"
                    aria-label={out ? tx("m_semUnidadesDisponiveis", { v0: b.name ? tl(b.name) : b.key }) : tx("m_arrasteParaOMural", { v0: b.name ? tl(b.name) : b.key })}
                    title={b.name ? tl(b.name) : undefined}
                    onPointerDown={(e) => begin(e.nativeEvent, { kind: "new", key: b.key }, e.currentTarget, true)}
                    onDragStart={(e) => e.preventDefault()}
                    className={`grid h-14 w-14 touch-none place-items-center rounded-xl transition ${out ? "cursor-not-allowed" : "cursor-grab hover:bg-white/10 active:cursor-grabbing"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={badgeSrc(b.key)} alt="" draggable={false} className={`max-h-12 max-w-12 select-none ${out ? "opacity-30 grayscale" : ""}`} style={{ filter: out ? undefined : "drop-shadow(0 2px 3px rgba(0,0,0,.5))" }} />
                  </button>
                  <span aria-hidden className={`pointer-events-none absolute top-0 right-0 grid min-w-[1.15rem] place-items-center rounded-md px-1 text-[10px] leading-[1.15rem] font-bold text-white ${out ? "bg-[#7a6b5a]" : "bg-[#d98a2b]"}`}>
                    {st.left ?? 0}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {/* arrastando um botton que já está no mural: avisa onde soltar para devolvê-lo */}
      {draggingId && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl border-2 border-dashed border-[#f2c230] bg-[#1c1510]/90 px-3 text-center text-sm font-bold text-[#f7f0dd]">
          {tx("solteAquiParaTirarDo")}</div>
      )}
      {/* arrastando um botton novo: avisa para soltar no mural */}
      {draggingNew && !draggingId && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl border-2 border-dashed border-[#f2c230] bg-[#1c1510]/90 px-3 text-center text-sm font-bold text-[#f7f0dd]">
          {tx("solteOPinNoMural")}</div>
      )}
      <div className="flex items-center gap-2">
        {storeBtn}
        <span aria-hidden className="h-9 w-px shrink-0 bg-white/20" />
        {strip}
        {!hideRewards && (
          <>
            <span aria-hidden className="h-9 w-px shrink-0 bg-white/20" />
            {rewardsBtn}
          </>
        )}
      </div>
    </section>
  );

  return block;
}
