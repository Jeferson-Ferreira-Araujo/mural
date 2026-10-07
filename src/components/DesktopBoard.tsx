"use client";

import { boardById, DEFAULT_BOARD } from "@/lib/boards";
import { BOARD_CAPACITY } from "@/lib/plans";
import { BoardCanvas } from "./board/BoardCanvas";
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
  const look = boardById(board);
  const hasPager = !!muralSwitch && muralSwitch.items.length >= 2;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#3b2616]">
      <Sidebar compact={hasSelection} guestNext={guestNext} siteStats={siteStats} panel={panel} panelTitle={panelTitle} notice={notice} account={account} menu={props.sidebarMenu} />

      {/* bloco da direita: a lousa ocupa TODO o espaço; o topo e o botão ficam sobrepostos a ela */}
      <div className={`relative min-w-0 flex-1 overflow-hidden transition-opacity duration-300 ${props.boardPending ? "opacity-0" : "opacity-100"}`}>
        {/* ambiente: a mesma foto desfocada preenche as laterais */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={look.image} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-80 blur-2xl" />

        <nav aria-label="Informações do mural" className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 px-[2.2vw] pt-5">
          <div className="pointer-events-auto flex min-h-11 min-w-0 items-center gap-2">
            {/* nome do mural: pílula igual à do botão Pesquisar Usuário, alinhada à esquerda */}
            {hasSelection && props.muralInfo?.title && (
              <h2 className="grid h-11 max-w-[42vw] place-items-center rounded-xl bg-[#fbf6ea] px-5 text-sm font-semibold text-[#2a1c12] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.3)]">
                <span className="block max-w-full truncate">{props.muralInfo.title}</span>
              </h2>
            )}
            {/* convida outras pessoas a ver este mural */}
            {hasSelection && share && (
              <ShareButton iconOnly title="Convidar pessoas para ver este mural" text={share.text} path={share.path} onNotify={onNotify} className="shrink-0 bg-[#fbf6ea] text-[#2a1c12] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.3)] hover:bg-white" />
            )}
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            {account && <AccountActions account={account} tone="dark" menu={false} />}
          </div>
        </nav>


        <BoardCanvas items={items} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} locked={locked} onCompose={onCompose}>
          {locked && <LockedNotice hasSelection={hasSelection} />}
        </BoardCanvas>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-center gap-3 px-[2.2vw] pb-5">
          {hasPager && <div aria-hidden className="w-[9.5rem] shrink-0" />}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <BadgeBar className="pointer-events-auto w-[min(46rem,100%)]" />
          </div>
          {hasPager && <MuralPager sw={muralSwitch} tone="dark" className="pointer-events-auto w-[9.5rem] bg-[#2a1c12]/70 shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.35)] backdrop-blur-md" />}
        </div>
      </div>
    </div>
  );
}