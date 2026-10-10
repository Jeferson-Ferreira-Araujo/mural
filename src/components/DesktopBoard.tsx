"use client";

import { boardById, DEFAULT_BOARD } from "@/lib/boards";
import { BOARD_CAPACITY } from "@/lib/plans";
import { BoardCanvas } from "./board/BoardCanvas";
import { PannableBoard } from "./board/PannableBoard";
import { AccountActions } from "./account/AccountActions";
import { BadgeBar } from "./badges/BadgeBar";
import { MuralNameMenu } from "./MuralNameMenu";
import { LockedNotice } from "./LockedNotice";
import { ShareButton } from "./ShareButton";
import { FollowButton } from "./FollowButton";
import { PlanLimit } from "./PlanLimit";
import { Sidebar } from "./Sidebar";
import type { ViewProps } from "./viewProps";

/** Imagem da lousa (desktop). Original em /imagens/quadro-desktop.png; versão otimizada servida daqui. */
export const BOARD_IMAGE = boardById(DEFAULT_BOARD).image;

/**
 * Mural físico completo: 28 espaços fixos numa lousa que não cresce (veja `BoardCanvas`).
 * Fica desfocado até a pessoa acertar a pergunta de desbloqueio.
 */
export function DesktopBoard(props: ViewProps) {
  const lockForm = props.locked ? props.panel("dark", "form") : null;
  const { items, plan, showMeter, locked, hasSelection, unlocked, siteStats, board, capacity = BOARD_CAPACITY, share, panel, panelTitle, notice, onCompose, onNotify, account, guestNext, muralSwitch } = props;
  const look = boardById(board);
  const newMural = account?.onNewMural; // PINZ+: botão "Novo mural" abaixo do passador de murais
  const hasRight = !!newMural;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#3b2616]">
      <Sidebar compact={hasSelection} guestNext={guestNext} siteStats={siteStats} panel={panel} panelTitle={panelTitle} notice={notice} account={account} menu={props.sidebarMenu} />

      {/* bloco da direita: a lousa ocupa TODO o espaço; o topo e o botão ficam sobrepostos a ela */}
      {/* o mural ocupa a largura que a proporção 3:2 pede para caber inteiro na altura; o que sobrar vira a barra bege */}
      <div style={{ width: "min(calc(100% - clamp(290px, 23vw, 360px)), 150dvh)" }} className={`relative shrink-0 overflow-hidden transition-opacity duration-300 ${props.boardPending ? "opacity-0" : "opacity-100"}`}>
        {/* ambiente: a mesma foto desfocada preenche as laterais */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={look.image} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-80 blur-2xl" />

        <nav aria-label="Informações do mural" className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 px-[2.2vw] pt-5">
          <div className="pointer-events-auto flex min-h-11 min-w-0 items-center gap-2">
            {/* nome do mural: pílula igual à do botão Pesquisar Usuário, alinhada à esquerda */}
            {hasSelection && !locked && props.muralInfo?.title && (
              <h2 className="grid h-11 max-w-[42vw] place-items-center rounded-xl bg-[#fbf6ea] px-5 text-sm font-semibold text-[#2a1c12] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.3)]">
                <MuralNameMenu title={props.muralInfo.title} sw={muralSwitch} showShared={!!account?.atHome} />
              </h2>
            )}
            {hasSelection && !locked && unlocked && account?.atHome && plan === "free" && <PlanLimit used={items.length} />}
            {hasSelection && !locked && props.follow && <FollowButton follow={props.follow} />}
            {/* convida outras pessoas a ver este mural */}
            {hasSelection && share && (
              <ShareButton iconOnly title="Convidar pessoas para ver este mural" text={share.text} path={share.path} onNotify={onNotify} className="shrink-0 bg-[#fbf6ea] text-[#2a1c12] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.3)] hover:bg-white" />
            )}
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            {/* só no próprio mural: no de outra pessoa, a pesquisa fica na coluna bege e o sino não aparece */}
            {account?.atHome && <AccountActions account={account} tone="dark" menu={false} />}
          </div>
        </nav>


        {/* o mural abre sempre inteiro; o botão e a roda do mouse aproximam, e com o quadro aproximado dá para arrastá-lo */}
        <div className="absolute inset-0">
        <PannableBoard ambient={look.image} controlPos={account?.atHome ? "right-[2.2vw] top-[4.6rem]" : "right-[2.2vw] top-5"} hideControls={locked}>
        <BoardCanvas items={items} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} locked={locked} onCompose={onCompose} contain>
          {locked &&
            (lockForm ? (
              // a pergunta fica bem no centro do quadro: fica claro que só entra quem acertar a resposta
              <div className="absolute inset-0 z-30 grid place-items-center overflow-y-auto p-6 text-[clamp(14px,1.1vw,17px)]">{lockForm}</div>
            ) : (
              <LockedNotice hasSelection={hasSelection} />
            ))}
        </BoardCanvas>
        </PannableBoard>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-center gap-3 px-[2.2vw] pb-5">
          {hasRight && <div aria-hidden className="w-[9.5rem] shrink-0" />}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <BadgeBar className="pointer-events-auto w-[min(46rem,100%)]" />
          </div>
          {hasRight && (
            <div className="pointer-events-auto flex w-[9.5rem] shrink-0 flex-col items-stretch gap-2">
              {newMural && (
                <button
                  type="button"
                  onClick={newMural}
                  className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#17110c]/85 px-4 text-sm font-semibold text-white shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur transition hover:bg-[#2b1c12] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]"
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Novo mural
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}