"use client";

import { boardById, DEFAULT_BOARD } from "@/lib/boards";
import { BOARD_CAPACITY, slotsFor } from "@/lib/plans";
import { BoardCanvas } from "./board/BoardCanvas";
import { PlanBadge } from "./board/PlanBadge";
import { AccountActions } from "./account/AccountActions";
import { BadgeBar } from "./badges/BadgeBar";
import { MuralPager } from "./MuralSwitcher";
import { LockedNotice } from "./LockedNotice";
import { ShareButton } from "./ShareButton";
import { Sidebar } from "./Sidebar";
import type { ViewProps } from "./viewProps";

/** Imagem da lousa (desktop). Original em /imagens/quadro-desktop.png; versão otimizada servida daqui. */
export const BOARD_IMAGE = boardById(DEFAULT_BOARD).image;

/**
 * Mural físico completo: 28 espaços fixos numa lousa que não cresce (veja `BoardCanvas`).
 * Fica desfocado até a pessoa acertar a pergunta de desbloqueio.
 */
export function DesktopBoard(props: ViewProps) {
  const { items, plan, showMeter, locked, hasSelection, unlocked, siteStats, board, capacity = BOARD_CAPACITY, share, panel, panelTitle, notice, onCompose, onNotify, account, guestNext, muralSwitch } = props;
  const available = slotsFor(plan, capacity);
  const look = boardById(board);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#3b2616]">
      <Sidebar compact={hasSelection} guestNext={guestNext} siteStats={siteStats} capacity={capacity} panel={panel} panelTitle={panelTitle} plan={plan} used={items.length} showMeter={showMeter} notice={notice} />

      {/* bloco da direita: a lousa ocupa TODO o espaço; o topo e o botão ficam sobrepostos a ela */}
      <div className={`relative min-w-0 flex-1 overflow-hidden transition-opacity duration-300 ${props.boardPending ? "opacity-0" : "opacity-100"}`}>
        {/* ambiente: a mesma foto desfocada preenche as laterais */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={look.image} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-80 blur-2xl" />

        <nav aria-label="Informações do mural" className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 px-[2.2vw] pt-5">
          <div className="flex min-h-10 items-center">
            {!hasSelection ? null : (
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
          <div className="flex items-center gap-2">
            {share && (
              <ShareButton title={share.title} path={share.path} onNotify={onNotify} className="bg-[#fbf6ea] text-[#2a1c12] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.3)] hover:bg-white" />
            )}
            <MuralPager sw={muralSwitch} tone="dark" className="bg-[#2a1c12]/70 shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.35)] backdrop-blur-md" />
            {account && <AccountActions account={account} tone="dark" />}
          </div>
        </nav>


        <BoardCanvas items={items} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} locked={locked} onCompose={onCompose} emptyMessage={props.welcome}>
          {locked && <LockedNotice hasSelection={hasSelection} />}
        </BoardCanvas>

        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 px-[2.2vw] pb-5">
          <BadgeBar className="w-[min(46rem,100%)]" />
        </div>
      </div>
    </div>
  );
}