"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { typeLabel } from "@/lib/types";
import { BoardTitle } from "./BoardTitle";
import { Brand } from "./Brand";
import { MessageView } from "./messages/MessageView";
import { ShareButton } from "./ShareButton";
import { UnlockPanel } from "./UnlockPanel";
import { EmptyNote } from "./EmptyNote";
import { CreateMuralLink } from "./CreateMuralLink";
import type { ViewProps } from "./viewProps";

const ROTATIONS = [-2, 1.5, -1, 2, -1.5, 1, -2.5, 2, -1, 1.5, -2, 1];

/** Experiência mobile/tablet: uma mensagem por vez, em carrossel com swipe. */
export function MobileCarousel({ messages, title, question, unlocked, onSubmitAnswer, onNotify, demo }: ViewProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

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

  return (
    <div
      className="relative min-h-dvh overflow-x-hidden bg-[#2a1a0e]"
      style={{
        backgroundImage:
          "radial-gradient(120% 70% at 50% 35%, rgba(60,30,8,.15), rgba(14,7,2,.82) 80%), linear-gradient(rgba(20,10,4,.5), rgba(20,10,4,.5)), url(/img/quadro-desktop.webp)",
        backgroundSize: "auto, auto, 380%",
        backgroundPosition: "center, center, 52% 48%",
      }}
    >
      <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-4 pt-4 pb-8 [font-size:16px]">
        <div className="mx-auto flex w-[min(90vw,30rem)] items-start justify-between gap-4">
          <div className="rise text-[16px] md:text-[18px]">
            <Brand className="-mt-2 -mb-1 h-16" />
            <BoardTitle title={title} tone="dark" />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <ShareButton title={title} onNotify={onNotify} className="border border-white/15 bg-[#1c1510]/70 text-white backdrop-blur" />
            <CreateMuralLink className="border border-white/15 bg-[#fbf6ea] text-[#2a1c12]" />
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="py-6 text-[16px] md:text-[20px]">
            <EmptyNote unlocked={unlocked} />
          </div>
        ) : (
        <section aria-roledescription="carrossel" aria-label="Mensagens do mural" onKeyDown={onKeyDown} className="relative">
          <button type="button" aria-label="Mensagem anterior" disabled={index === 0} onClick={() => goTo(index - 1)} className={`${arrow} left-2`}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 5-7 7 7 7" />
            </svg>
          </button>
          <button type="button" aria-label="Próxima mensagem" disabled={index === messages.length - 1} onClick={() => goTo(index + 1)} className={`${arrow} right-2`}>
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
                aria-label={`${typeLabel[m.type]}, ${i + 1} de ${messages.length}`}
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
            <span className="sr-only">{typeLabel[messages[index].type]}, </span>
            {index + 1} / {messages.length}
          </p>
        </section>
        )}

        <div className="mx-auto mt-auto w-[min(90vw,30rem)] pt-3 text-[15px] md:text-[16px]">
          <UnlockPanel question={question} unlocked={unlocked} onSubmit={onSubmitAnswer} inputId="unlock-answer-mobile" tone="dark" />
        </div>
      </main>
    </div>
  );
}
