"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { typeLabel, type Message } from "@/lib/types";
import { BoardHeader } from "./BoardHeader";
import { MessageView } from "./messages/MessageView";
import { UnlockPanel } from "./UnlockPanel";

type Props = {
  messages: Message[];
  owner: string;
  tagline: string;
  question: string;
  unlocked: boolean;
  onUnlock: () => void;
};

/** Experiência mobile/tablet: uma mensagem por vez, em carrossel com swipe. */
export function MobileCarousel({ messages, owner, tagline, question, unlocked, onUnlock }: Props) {
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

  const current = messages[index];
  const arrow =
    "grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-[#f7f0dd] text-[#2f2218] shadow-[0_0.2rem_0.6rem_rgba(40,20,5,.4)] transition active:scale-95 disabled:cursor-default disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]";

  return (
    <div
      className="relative min-h-dvh overflow-x-hidden bg-[#b9763a]"
      style={{
        backgroundImage: `linear-gradient(rgba(60,30,8,.18), rgba(60,30,8,.38)), url(/img/quadro-desktop.webp)`,
        backgroundSize: "auto, 380%",
        backgroundPosition: "center, 52% 48%",
      }}
    >
      <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-5 pt-6 pb-10 [font-size:16px] md:gap-7 md:pt-10">
        <div className="rise mx-auto w-[min(88vw,26rem)] md:text-[17px]">
          <BoardHeader owner={owner} tagline={tagline} />
        </div>

        <section aria-roledescription="carrossel" aria-label="Mensagens do mural" onKeyDown={onKeyDown}>
          <div
            ref={trackRef}
            tabIndex={0}
            className="no-scrollbar relative flex snap-x snap-mandatory items-center gap-2 overflow-x-auto px-[calc(50vw-min(43vw,11rem))] py-8 outline-none focus-visible:ring-2 focus-visible:ring-[#f7f0dd]/70 md:px-[calc(50%-12rem)]"
          >
            {messages.map((m, i) => (
              <div
                key={m.id}
                role="group"
                aria-roledescription="mensagem"
                aria-label={`${i + 1} de ${messages.length}`}
                className="flex w-[min(86vw,22rem)] shrink-0 snap-center justify-center md:w-[24rem]"
              >
                <div
                  className="pinned text-[17px] md:text-[19px]"
                  style={{ "--rot": `${m.pos.rot * 0.5}deg`, animationDelay: `${0.1 + Math.min(i, 3) * 0.1}s` } as CSSProperties}
                >
                  <MessageView message={m} />
                </div>
              </div>
            ))}
          </div>

          <div className="mx-auto flex w-[min(88vw,26rem)] items-center justify-between gap-3">
            <button type="button" aria-label="Mensagem anterior" disabled={index === 0} onClick={() => goTo(index - 1)} className={arrow}>
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m15 5-7 7 7 7" />
              </svg>
            </button>
            <div className="text-center" aria-live="polite">
              <p className="mx-auto w-fit rounded-full bg-[#f7f0dd] px-4 py-1 text-xs font-semibold tracking-[0.18em] text-[#2f2218] uppercase shadow-[0_0.15rem_0.5rem_rgba(40,20,5,.35)]">
                {typeLabel[current.type]}
              </p>
              <p className="mt-1.5 text-sm font-medium text-[#fff6e0] [text-shadow:0_1px_3px_rgba(40,20,5,.7)]">
                {index + 1} / {messages.length}
              </p>
            </div>
            <button type="button" aria-label="Próxima mensagem" disabled={index === messages.length - 1} onClick={() => goTo(index + 1)} className={arrow}>
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m9 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>

        <div className="mx-auto mt-auto w-[min(88vw,26rem)] pt-4 text-[16px] md:text-[17px]">
          <UnlockPanel question={question} unlocked={unlocked} onUnlock={onUnlock} />
        </div>
      </main>
    </div>
  );
}
