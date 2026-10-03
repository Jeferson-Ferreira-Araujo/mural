"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { boardById } from "@/lib/boards";
import { LandscapeViewer } from "./board/LandscapeViewer";
import { isHidden, isSealed, typeLabel, type BoardItem } from "@/lib/types";
import { SlotMeter } from "./board/SlotMeter";
import { Brand } from "./Brand";
import { CreateMuralLink } from "./CreateMuralLink";
import { MyMuralLink } from "./MyMuralLink";
import { EmptyNote } from "./EmptyNote";
import { LockedNotice } from "./LockedNotice";
import { MessageView } from "./messages/MessageView";
import { ShareButton } from "./ShareButton";
import type { ViewProps } from "./viewProps";

const labelOf = (i: BoardItem) => (isSealed(i) ? "Cápsula fechada" : isHidden(i) ? "Pin em blur" : typeLabel[i.type]);

const ROTATIONS = [-2, 1.5, -1, 2, -1.5, 1, -2.5, 2, -1, 1.5, -2, 1];

/** Experiência mobile/tablet: uma mensagem por vez, em carrossel com swipe. Desfocada até desbloquear. */
export function MobileCarousel({ items: messages, plan, showMeter, locked, hasSelection, unlocked, share, panel, notice, onCompose, onNotify, landing = false, board, capacity }: ViewProps) {
  const look = boardById(board);
  const bgX = look.cork.left + look.cork.width / 2;
  const bgY = look.cork.top + look.cork.height / 2;
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [viewing, setViewing] = useState(false); // mural em tela cheia, na horizontal

  const updateIndex = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(track.children).forEach((el, i) => {
      const c = (el as HTMLElement).offsetLeft + (el as HTMLElement).offsetWidth / 2;
      const d = Math.abs(c - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setIndex(best);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", updateIndex, { passive: true });
    return () => track.removeEventListener("scroll", updateIndex);
  }, [updateIndex]);

  function goTo(i: number) {
    const track = trackRef.current;
    const el = track?.children[i] as HTMLElement | undefined;
    if (!track || !el) return;
    track.scrollTo({ left: el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") goTo(Math.min(index + 1, messages.length - 1));
    if (e.key === "ArrowLeft") goTo(Math.max(index - 1, 0));
  }

  const arrow =
    "absolute top-1/2 z-10 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/15 bg-[#17110c]/80 text-white shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur transition active:scale-95 disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]";

  const safeIndex = Math.min(index, Math.max(messages.length - 1, 0));

  return (
    <div
      className="relative min-h-dvh overflow-x-hidden bg-[#2a1a0e]"
      style={{
        backgroundImage:
          `radial-gradient(120% 70% at 50% 35%, rgba(60,30,8,.15), rgba(14,7,2,.82) 80%), linear-gradient(rgba(20,10,4,.5), rgba(20,10,4,.5)), url(${look.image})`,
        backgroundSize: "auto, auto, 380%",
        backgroundPosition: `center, center, ${bgX.toFixed(1)}% ${bgY.toFixed(1)}%`,
      }}
    >
      <main className="mx-auto flex min-h-dvh max-w-4xl flex-col pt-4 pb-6 [font-size:16px]">
        <div className={`flex flex-1 flex-col transition-[gap] duration-500 ${landing ? "justify-center gap-6" : "gap-4"}`}>
        <header className="rise mx-auto flex w-[min(90vw,30rem)] flex-col items-center gap-3">
          <h1 className="sr-only">Pinz</h1>
          <Brand className={`transition-[height] duration-500 ease-out ${landing ? "h-[clamp(9rem,27vh,13rem)]" : "h-[4.6rem]"}`} />
          {hasSelection ? (
            // mural escolhido: botões pequenos lado a lado; o foco é a pergunta
            <div className={`grid w-full max-w-[21rem] gap-2 ${share ? "grid-cols-2" : "grid-cols-1"}`}>
              <MyMuralLink tone="dark" label="Acessar meu mural" className="w-full !py-[0.6em] !text-[0.85em]" />
              {share && <ShareButton title={share.title} path={share.path} onNotify={onNotify} className="w-full justify-center border border-white/15 bg-[#1c1510]/70 !py-[0.6em] text-white backdrop-blur" />}
            </div>
          ) : (
            <MyMuralLink tone="dark" big label="Acessar meu mural" className="w-full max-w-[21rem]" />
          )}
          {!landing && hasSelection && !locked && (
            <button
              type="button"
              onClick={() => setViewing(true)}
              className="inline-flex w-full max-w-[21rem] cursor-pointer items-center justify-center gap-2 rounded-full border border-white/15 bg-[#1c1510]/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]"
            >
              <svg viewBox="0 0 24 24" className="size-[1.15em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <path d="M7 10h3M13 10h4M7 14h5" />
              </svg>
              Ver mural
            </button>
          )}
        </header>

        {/* busca, escolha do mural e pergunta de desbloqueio */}
        <div className="mx-auto w-[min(90vw,30rem)] text-[15px] md:text-[16px]">{panel("dark")}</div>

        {!landing && (showMeter || notice) && (
          <div className="mx-auto w-[min(90vw,30rem)] space-y-3 text-[15px] md:text-[16px]">
            {showMeter && !locked && <SlotMeter plan={plan} used={messages.length} tone="dark" capacity={capacity} />}
            {!locked && notice?.("dark")}
          </div>
        )}

        <section hidden={landing || locked} aria-roledescription="carrossel" aria-label="Mensagens do mural" onKeyDown={onKeyDown} className="relative">
          <div
            className="transition-[filter] duration-700 ease-out"
            style={{ filter: locked ? "blur(9px) saturate(0.85)" : "none" }}
            aria-hidden={locked}
            inert={locked}
          >
            {messages.length === 0 ? (
              <div className="py-6 text-[16px] md:text-[20px]">
                <EmptyNote unlocked={unlocked} />
              </div>
            ) : (
              <>
                <button type="button" aria-label="Mensagem anterior" disabled={safeIndex === 0} onClick={() => goTo(safeIndex - 1)} className={`${arrow} left-2`}>
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m15 5-7 7 7 7" />
                  </svg>
                </button>
                <button type="button" aria-label="Próxima mensagem" disabled={safeIndex === messages.length - 1} onClick={() => goTo(safeIndex + 1)} className={`${arrow} right-2`}>
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m9 5 7 7-7 7" />
                  </svg>
                </button>

                <div
                  ref={trackRef}
                  tabIndex={0}
                  className="no-scrollbar relative flex snap-x snap-mandatory items-center gap-0 overflow-x-auto px-[calc(50%-min(45vw,11rem))] py-8 outline-none focus-visible:ring-2 focus-visible:ring-[#f7f0dd]/60 md:px-[calc(50%-11rem)]"
                >
                  {messages.map((m, i) => (
                    <div
                      key={m.id}
                      role="group"
                      aria-roledescription="mensagem"
                      aria-label={`${labelOf(m)}, ${i + 1} de ${messages.length}`}
                      className="flex w-[min(90vw,22rem)] shrink-0 snap-center items-center justify-center md:w-[22rem]"
                    >
                      <div
                        className="pinned text-[clamp(16px,5.6vw,22px)] md:text-[22px]"
                        style={{ "--rot": `${ROTATIONS[i % ROTATIONS.length]}deg`, animationDelay: `${0.1 + Math.min(i, 3) * 0.1}s` } as CSSProperties}
                      >
                        <MessageView message={m} />
                      </div>
                    </div>
                  ))}
                </div>

                <p aria-live="polite" className="mx-auto w-fit rounded-full bg-[#1c1510]/75 px-4 py-1.5 text-sm font-medium text-[#fff6e0] backdrop-blur">
                  <span className="sr-only">{labelOf(messages[safeIndex])}, </span>
                  {safeIndex + 1} / {messages.length}
                </p>
              </>
            )}
          </div>
          {locked && <LockedNotice hasSelection={hasSelection} dark />}
        </section>

        {!landing && onCompose && unlocked && (
          <div className="mx-auto w-[min(90vw,30rem)]">
            <button
              type="button"
              onClick={() => onCompose()}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-[#fbf6ea] py-3 text-base font-semibold text-[#2a1c12] shadow-[0_0.6rem_1.6rem_rgba(0,0,0,.4)] transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]"
            >
              <span className="grid size-8 place-items-center rounded-full bg-[#1f232b] text-lg leading-none text-white">+</span>
              Deixar uma mensagem anônima
            </button>
          </div>
        )}
        </div>

        {/* rodapé: criar um novo mural */}
        <footer className="mx-auto mt-6 w-[min(90vw,30rem)]">
          <CreateMuralLink className="w-full justify-center border border-white/15 bg-[#fbf6ea] py-3 text-[#2a1c12]" />
        </footer>
      </main>
      <LandscapeViewer open={viewing} onClose={() => setViewing(false)} items={messages} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} />
    </div>
  );
}
