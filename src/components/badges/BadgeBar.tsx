"use client";

import { useEffect, useRef, useState } from "react";
import { BADGES, badgeSrc } from "@/lib/badges";
import { OPEN_REWARDS_EVENT } from "@/lib/rewards";
import { useBadges } from "./BadgeContext";


/**
 * Barra de baixo (só para o dono, no próprio mural): os pins decorativos que ele tem, numa faixa que rola na horizontal.
 * Arraste um deles para o mural; solte um que já está no mural sobre esta barra para tirá-lo (a unidade volta).
 * Cada pin tem 1 unidade + as extras compradas (esgota ao colocar, volta ao tirar do mural). Ninguém tem ilimitado. Mais Bottons e unidades: ícone da loja, fixo no início da barra.
 */
export function BadgeBar({ className = "", hideRewards = false }: { className?: string; /** celular: o "Ganhar créditos" fica no menu lateral, não na barra */ hideRewards?: boolean }) {
  const { editable, begin, stock, openStore, acquiredAt, draggingId, draggingNew } = useBadges();
  const [partyOpen, setPartyOpen] = useState(false); // painel dos bottons de aniversário (abre para cima)
  const box = useRef<HTMLElement>(null);
  // começou a arrastar um botton do painel: o painel fecha para o mural ficar à vista
  const wasDragging = useRef(false);
  useEffect(() => {
    if (wasDragging.current && !draggingNew) setPartyOpen(false);
    wasDragging.current = draggingNew;
  }, [draggingNew]);
  // tocar fora do painel fecha
  useEffect(() => {
    if (!partyOpen) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setPartyOpen(false);
    };
    window.addEventListener("pointerdown", away, true);
    return () => window.removeEventListener("pointerdown", away, true);
  }, [partyOpen]);
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
  // os bottons de aniversário (82 a 123) viram um grupo só na barra: um botão abre um painel com todos, em vez de uma fileira enorme
  const isParty = (k: number) => k >= 82 && k <= 123;
  const plain = mine.filter((b) => !isParty(b.key));
  const party = mine.filter((b) => isParty(b.key));
  const partyBtn =
    party.length > 0 ? (
      <li className="relative shrink-0">
        <button
          type="button"
          onClick={() => setPartyOpen((v) => !v)}
          aria-expanded={partyOpen}
          aria-label={`Bottons de aniversário (${party.length}): abrir a lista`}
          title="Bottons de aniversário"
          className="grid h-14 w-14 cursor-pointer place-items-center rounded-xl pt-3 transition hover:bg-white/10 active:scale-95"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={badgeSrc(88)} alt="" draggable={false} className="max-h-10 max-w-10 select-none" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,.5))" }} />
        </button>
        {/* setinha para cima: avisa que o botão abre uma lista (e não é só um botton); também abre ao tocar */}
        <button type="button" onClick={() => setPartyOpen((v) => !v)} aria-label="Abrir a lista de bottons de aniversário" tabIndex={-1} className="absolute top-0 left-1/2 grid h-5 w-10 -translate-x-1/2 -translate-y-1.5 cursor-pointer place-items-center text-[#f2c230] drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]">
          <svg viewBox="0 0 16 16" className={`h-5 w-5 transition-transform ${partyOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 10l5-5 5 5" />
          </svg>
        </button>
      </li>
    ) : null;
  const storeBtn = (
        <button type="button" onClick={openStore} data-tour="store" aria-label="Loja de Bottons" title="Loja" className="flex h-14 w-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl bg-gradient-to-b from-[#ffd75e] to-[#f5a50f] ring-1 ring-[#e39a0b]/60 text-[#2a1c12] shadow-[0_0.2rem_0.6rem_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.55)] transition hover:brightness-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 8h16l-1.2 11.2a1 1 0 0 1-1 .8H6.2a1 1 0 0 1-1-.8L4 8Z" />
            <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
          </svg>
          <span className="text-[11px] leading-none font-bold">Loja</span>
        </button>
  );
  const rewardsBtn = (
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_REWARDS_EVENT))} data-tour="rewards" aria-label="Ganhar créditos" title="Ganhar créditos" className="flex h-14 w-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl bg-gradient-to-b from-[#ffd75e] to-[#f5a50f] ring-1 ring-[#e39a0b]/60 text-[#2a1c12] shadow-[0_0.2rem_0.6rem_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.55)] transition hover:brightness-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/moeda.webp" alt="" aria-hidden draggable={false} className="pointer-events-none size-5 select-none object-contain" />
          <span className="text-[11px] leading-none font-bold">Ganhar</span>
        </button>
  );
  const strip = (
      <ul className="flex min-w-0 flex-1 gap-2.5 overflow-x-auto overscroll-x-contain pt-1.5 pr-1.5 pb-1 [touch-action:pan-x] [scrollbar-color:rgba(255,255,255,.35)_transparent] [scrollbar-width:thin]">
        {partyBtn}
        {plain.map((b) => {
          const st = stock(b.key);
          const out = st.left === 0;
          return (
            <li key={b.key} className="relative shrink-0">
              <button
                type="button"
                aria-label={out ? `Botton ${b.name ?? b.key}: sem unidades disponíveis` : `Botton ${b.name ?? b.key}: arraste para o mural`}
                onPointerDown={(e) => begin(e.nativeEvent, { kind: "new", key: b.key }, e.currentTarget)}
                onDragStart={(e) => e.preventDefault()}
                className={`grid h-14 w-14 touch-pan-x place-items-center rounded-xl transition ${out ? "cursor-not-allowed" : "cursor-grab hover:bg-white/10 active:cursor-grabbing"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badgeSrc(b.key)} alt="" draggable={false} className={`max-h-12 max-w-12 select-none transition ${out ? "opacity-30 grayscale" : ""}`} style={{ filter: out ? undefined : "drop-shadow(0 2px 3px rgba(0,0,0,.5))" }} />
              </button>
              {/* quantidade que a pessoa ainda tem para colocar */}
              <span
                aria-label={`${st.left ?? 0} disponível${st.left === 1 ? "" : "is"}`}
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
    <section ref={box} data-badge-bar data-tour="badges" aria-label="Seus Bottons" className={`relative rounded-2xl border border-white/15 bg-[#1c1510]/80 px-3 py-2 text-white shadow-[0_0.6rem_1.6rem_rgba(0,0,0,.45)] backdrop-blur-md ${className}`}>
      {/* painel dos bottons de aniversário: abre para cima da barra; arraste um deles para o mural */}
      {partyOpen && party.length > 0 && (
        <div role="dialog" aria-label="Bottons de aniversário" className={`absolute bottom-full left-0 z-30 mb-2 max-h-[46dvh] w-max max-w-full overflow-y-auto rounded-2xl border border-white/15 bg-[#1c1510]/95 p-3 text-white shadow-[0_0.6rem_1.6rem_rgba(0,0,0,.55)] backdrop-blur-md ${draggingNew ? "invisible" : ""}`}>
          <p className="mb-2 flex items-center justify-between text-sm font-bold">
            <span>🎂 Bottons de aniversário</span>
            <button type="button" onClick={() => setPartyOpen(false)} aria-label="Fechar" className="grid size-7 cursor-pointer place-items-center rounded-lg text-lg leading-none hover:bg-white/10">
              ×
            </button>
          </p>
          <ul className="flex flex-wrap gap-1" style={{ maxWidth: "26rem" }}>
            {party.map((b) => {
              const st = stock(b.key);
              const out = st.left === 0;
              return (
                <li key={b.key} className="relative">
                  <button
                    type="button"
                    aria-label={out ? `${b.name ?? b.key}: sem unidades disponíveis` : `${b.name ?? b.key}: arraste para o mural`}
                    title={b.name}
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
          Solte aqui para tirar do mural
        </div>
      )}
      {/* arrastando um botton novo: avisa para soltar no mural */}
      {draggingNew && !draggingId && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl border-2 border-dashed border-[#f2c230] bg-[#1c1510]/90 px-3 text-center text-sm font-bold text-[#f7f0dd]">
          Solte o pin no mural
        </div>
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
