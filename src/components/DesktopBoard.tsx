"use client";

import { useState } from "react";
import { boardById, DEFAULT_BOARD } from "@/lib/boards";
import { layoutSlots } from "@/lib/slots";
import { BOARD_CAPACITY, slotsFor } from "@/lib/plans";
import { BoardCanvas } from "./board/BoardCanvas";
import { PlanBadge } from "./board/PlanBadge";
import { LockedNotice } from "./LockedNotice";
import { ShareButton } from "./ShareButton";
import { Sidebar } from "./Sidebar";
import type { ViewProps } from "./viewProps";

/** Imagem da lousa (desktop). Original em /imagens/quadro-desktop.png; versão otimizada servida daqui. */
export const BOARD_IMAGE = boardById(DEFAULT_BOARD).image;

/** Foca o primeiro campo de busca/resposta visível (usado pelo botão "Deixar uma mensagem"). */
function focusFirstField() {
  const fields = Array.from(document.querySelectorAll<HTMLElement>("[data-focus-target]"));
  fields.find((el) => el.offsetParent !== null)?.focus();
}

/**
 * Mural físico completo: 28 espaços fixos numa lousa que não cresce (veja `BoardCanvas`).
 * Fica desfocado até a pessoa acertar a pergunta de desbloqueio.
 */
export function DesktopBoard(props: ViewProps) {
  const { items, plan, showMeter, locked, hasSelection, unlocked, siteStats, board, capacity = BOARD_CAPACITY, share, panel, panelTitle, notice, onCompose, onNotify } = props;
  const layout = layoutSlots(items, capacity);
  const [hint, setHint] = useState(false); // destaca os espaços livres depois de tocar em "Deixar uma mensagem"
  const available = slotsFor(plan, capacity);
  const look = boardById(board);

  function addMessage() {
    if (!unlocked) {
      focusFirstField();
      onNotify(hasSelection ? "Responda a pergunta para desbloquear o mural." : "Procure alguém pelo username primeiro.");
      return;
    }
    if (!onCompose) return;
    // dentro do limite do plano e com espaço livre: o visitante clica no espaço onde quer o pin; no limite, o compositor explica
    if (hasSelection && items.length < available && layout.some((it) => !it)) {
      setHint(true);
      window.setTimeout(() => setHint(false), 4500);
      onNotify("Clique num espaço livre do mural para colar o seu pin.");
      return;
    }
    onCompose();
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#3b2616]">
      <Sidebar compact={hasSelection} siteStats={siteStats} capacity={capacity} panel={panel} panelTitle={panelTitle} plan={plan} used={items.length} showMeter={showMeter} notice={notice} />

      {/* bloco da direita: a lousa ocupa TODO o espaço; o topo e o botão ficam sobrepostos a ela */}
      <div className="relative min-w-0 flex-1 overflow-hidden">
        {/* ambiente: a mesma foto desfocada preenche as laterais */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={look.image} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-80 blur-2xl" />

        <nav aria-label="Informações do mural" className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 px-[2.2vw] pt-5">
          <div className="flex min-h-10 items-center">
            {!hasSelection ? (
              <span className="rounded-2xl bg-[#2a1c12]/70 px-4 py-2 text-sm font-semibold text-[#f7f0dd] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.35)] backdrop-blur-md">Exemplo de mural</span>
            ) : (
              showMeter &&
              !locked && (
                <div className="flex items-center gap-2 rounded-2xl bg-[#2a1c12]/70 px-3 py-2 shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.35)] backdrop-blur-md" aria-label={`${items.length} de ${available} espaços ocupados`}>
                  <PlanBadge plan={plan} />
                  <span className="text-sm font-semibold text-[#f7f0dd]">
                    {items.length}/{available}
                  </span>
                </div>
              )
            )}
          </div>
          {share && (
            <ShareButton title={share.title} path={share.path} onNotify={onNotify} className="bg-[#fbf6ea] text-[#2a1c12] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.3)] hover:bg-white" />
          )}
        </nav>


        <BoardCanvas items={items} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} locked={locked} onCompose={onCompose} hint={hint} emptyMessage={props.welcome}>
          {locked && <LockedNotice hasSelection={hasSelection} />}
        </BoardCanvas>

        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 pb-5">
          {onCompose && !locked && (
            <button
              type="button"
              onClick={addMessage}
              className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-[#fbf6ea] py-2.5 pr-7 pl-2.5 text-base font-semibold text-[#2a1c12] shadow-[0_0.6rem_1.6rem_rgba(0,0,0,.4)] transition hover:-translate-y-0.5 hover:bg-white active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]"
            >
              <span className="grid size-9 place-items-center rounded-full bg-[#1f232b] text-xl leading-none text-white">+</span>
              Deixar um PIN
            </button>
          )}
        </div>
      </div>
    </div>
  );
}