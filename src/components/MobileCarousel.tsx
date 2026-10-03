"use client";

import { useEffect, useRef, useState } from "react";
import { boardById } from "@/lib/boards";
import { LandscapeViewer } from "./board/LandscapeViewer";
import { Brand } from "./Brand";
import { CreateMuralLink } from "./CreateMuralLink";
import { MyMuralLink } from "./MyMuralLink";
import type { ViewProps } from "./viewProps";

/**
 * Experiência mobile/tablet: logo, busca e pergunta no centro; os dois botões de conta no rodapé.
 * Depois de desbloquear, o mural abre sozinho em tela cheia e na horizontal (`LandscapeViewer`): é por ele que a pessoa
 * vê os pins e cola o seu. Fechando, sobra um botão de destaque para abrir o mural de novo.
 */
export function MobileCarousel({ items, plan, locked, hasSelection, unlocked, panel, onCompose, landing = false, board, capacity, composing = false, autoOpenBoard = false, muralInfo }: ViewProps) {
  const look = boardById(board);
  const bgX = look.cork.left + look.cork.width / 2;
  const bgY = look.cork.top + look.cork.height / 2;
  const [viewing, setViewing] = useState(false); // mural em tela cheia, na horizontal

  // ao desbloquear, abre o mural sozinho (uma vez por mural); trancou de novo, esquece
  const opened = useRef<string | null>(null);
  const key = muralInfo ? `${muralInfo.owner}/${muralInfo.title}` : "mural";
  useEffect(() => {
    if (!autoOpenBoard || !unlocked || !hasSelection || landing) {
      opened.current = null;
      return;
    }
    if (opened.current !== key) {
      opened.current = key;
      setViewing(true);
    }
  }, [autoOpenBoard, unlocked, hasSelection, landing, key]);

  // tocar num espaço livre abre o compositor (em retrato); quando ele fecha, o mural volta
  const resume = useRef(false);
  useEffect(() => {
    if (!composing && resume.current) {
      resume.current = false;
      setViewing(true);
    }
  }, [composing]);
  function composeFromViewer(slot?: number) {
    resume.current = true;
    setViewing(false);
    onCompose?.(slot);
  }

  const canOpen = !landing && hasSelection && unlocked && !locked;

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
          </header>

          {/* busca, escolha do mural e pergunta de desbloqueio */}
          <div className="mx-auto w-[min(90vw,30rem)] text-[15px] md:text-[16px]">{panel("dark")}</div>

          {/* destaque: abrir o mural (a interação acontece por ele) */}
          {canOpen && (
            <div className="mx-auto w-[min(90vw,30rem)]">
              <button
                type="button"
                onClick={() => setViewing(true)}
                className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-[1em] bg-[#d9a21b] px-5 py-[1.05em] text-[1.15em] font-bold text-[#2a1c12] shadow-[0_0.5em_1.4em_rgba(120,70,0,.45)] transition hover:bg-[#e6ae22] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]"
              >
                <svg viewBox="0 0 24 24" className="size-[1.3em] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="6" width="18" height="12" rx="2" />
                  <path d="M7 10h3M13 10h4M7 14h5" />
                </svg>
                Abrir o mural
              </button>
              <p className="mt-2 text-center text-[0.8em] text-white/65">Toque nos espaços livres para deixar o seu recado.</p>
            </div>
          )}
        </div>

        {/* rodapé: os dois botões de conta, um abaixo do outro */}
        <footer className="mx-auto mt-6 flex w-[min(90vw,30rem)] flex-col gap-2">
          <MyMuralLink tone="dark" big label="Acessar meu mural" className="w-full" />
          <CreateMuralLink className="w-full justify-center border border-white/15 bg-[#fbf6ea] py-3 text-[#2a1c12]" />
        </footer>
      </main>
      <LandscapeViewer
        open={viewing}
        onClose={() => setViewing(false)}
        onCompose={onCompose ? composeFromViewer : null}
        items={items}
        plan={plan}
        board={board}
        capacity={capacity}
        hasSelection={hasSelection}
        unlocked={unlocked}
        info={muralInfo}
      />
    </div>
  );
}
