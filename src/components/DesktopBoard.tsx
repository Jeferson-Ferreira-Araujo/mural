"use client";

import { boardById, DEFAULT_BOARD, boardImageS, WIDE_EXTRA } from "@/lib/boards";
import { AddPinButton } from "./AddPinButton";
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
import { A11Y_OPEN_EVENT } from "@/lib/a11y";
import type { ViewProps } from "./viewProps";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useLit } from "@/i18n/literal";

const COLLAPSE_KEY = "pinz:sidebar-collapsed";

/** Imagem da lousa (desktop). Original em /imagens/quadro-desktop.png; versão otimizada servida daqui. */
export const BOARD_IMAGE = boardImageS(boardById(DEFAULT_BOARD)); // só serve de fundo desfocado: a versão pequena basta

/**
 * Mural físico completo: 28 espaços fixos numa lousa que não cresce (veja `BoardCanvas`).
 * Fica desfocado até a pessoa acertar a pergunta de desbloqueio.
 */
export function DesktopBoard(props: ViewProps) {
  const tx = useTranslations("components.DesktopBoard");
  const tl = useLit();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {}
    // o mural se refaz na nova largura
    window.setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
  };
  const lockForm = props.locked ? props.panel("dark", "form") : null;
  const { items, plan, showMeter, locked, hasSelection, unlocked, siteStats, board, capacity = BOARD_CAPACITY, share, panel, panelTitle, notice, onCompose, onNotify, account, guestNext, muralSwitch } = props;
  const look = boardById(board);
  const newMural = account?.onNewMural; // PINZ+: botão "Novo mural" abaixo do passador de murais
  const canAdd = hasSelection && !locked && unlocked && !!props.onCompose; // botão "+ pin": o dono no próprio mural e quem visita um mural desbloqueado
  const visitor = !account?.atHome;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#3b2616] portrait:flex-col">
      <Sidebar compact={hasSelection} guestNext={guestNext} siteStats={siteStats} panel={panel} panelTitle={panelTitle} notice={notice} account={account} menu={props.sidebarMenu} collapsed={collapsed} />

      {/* bloco da direita: a lousa ocupa TODO o espaço; o topo e o botão ficam sobrepostos a ela */}
      {/* o mural ocupa a largura que a proporção 3:2 pede para caber inteiro na altura; o que sobrar vira a barra bege (até um limite) e,
          em monitores muito largos, a foto desfocada dos lados. Em monitores em pé (portrait) a barra bege vai para cima e o mural fica embaixo. */}
      <div className={`relative flex min-w-0 flex-[1_1_150dvh] justify-center overflow-hidden transition-opacity duration-300 portrait:min-h-0 portrait:flex-[1_1_0] portrait:items-center ${props.boardPending ? "opacity-0" : "opacity-100"}`}>
        {/* ambiente: a mesma foto desfocada preenche as laterais */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={boardImageS(look)} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-80 blur-md" />

        {/* aba na beirada: recolhe o menu lateral (o mural fica centralizado) ou o mostra de novo */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? tl("Mostrar o menu lateral") : tl("Recolher o menu lateral")}
          title={collapsed ? tl("Mostrar o menu lateral") : tl("Recolher o menu lateral")}
          className="absolute top-1/2 left-0 z-30 grid h-16 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-r-xl bg-[#fbf6ea]/95 text-[#4a3826] shadow-[0_0.3rem_1rem_rgba(0,0,0,.35)] transition hover:w-7 hover:bg-white portrait:hidden focus-visible:outline-2 focus-visible:outline-[#d98a2b]"
        >
          <svg viewBox="0 0 24 24" className={`size-4 transition-transform ${collapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>

        <div className={`relative h-full shrink-0 overflow-hidden portrait:h-auto portrait:w-[min(100%,78dvh)] portrait:aspect-[3/2] ${look.wide ? "w-full" : "w-[min(100%,150dvh)]"}`}>

        <nav aria-label={tx("informacoesDoMural")} className={`pointer-events-none absolute top-0 z-10 flex items-center justify-between gap-4 px-[2.2vw] pt-5 ${look.wide ? "left-1/2 w-[min(100%,150dvh)] -translate-x-1/2 portrait:inset-x-0 portrait:left-0 portrait:w-auto portrait:translate-x-0" : "inset-x-0"}`}>
          <div className="pointer-events-auto flex min-h-11 min-w-0 items-center gap-2">
            {/* nome do mural: pílula igual à do botão Pesquisar usuários, alinhada à esquerda */}
            {hasSelection && !locked && props.muralInfo?.title && (
              <h2 className="grid h-11 max-w-[42vw] place-items-center rounded-xl bg-[#fbf6ea] px-5 text-sm font-semibold text-[#2a1c12] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.3)]">
                <MuralNameMenu title={props.muralInfo.title} sw={muralSwitch} showShared={!!account?.atHome} onCreate={newMural} />
              </h2>
            )}
            {hasSelection && !locked && unlocked && account?.atHome && plan === "free" && <PlanLimit used={items.length} />}
            {hasSelection && !locked && props.follow && <FollowButton follow={props.follow} />}
            {/* no mural de outra pessoa: convidar para um mural só dos dois (abre o convite no perfil dela) */}
            {hasSelection && !locked && props.follow && !account?.atHome && (
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("pinz:invite-shared"))} className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-[#fbf6ea] px-4 text-sm font-semibold text-[#2a1c12] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.3)] transition hover:bg-white active:scale-95">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="9" cy="8" r="3.2" />
                  <path d="M3 20c0-3.3 2.7-5.5 6-5.5M17 9v6M14 12h6" />
                </svg>
                {tx("x_convidarParaOMuralCompartilhado")}</button>
            )}
            {/* convida outras pessoas a ver este mural */}
            {hasSelection && share && (
              <ShareButton reward iconOnly title={tx("convidarPessoasParaVerEste")} text={share.text} path={share.path} onNotify={onNotify} className="shrink-0 bg-[#fbf6ea] text-[#2a1c12] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.3)] hover:bg-white" />
            )}
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            {/* acessibilidade em destaque só na tela de entrada (sem login); depois do login vale o que a conta salvou e o atalho fica no menu da conta */}
            {!account && (
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(A11Y_OPEN_EVENT))} aria-label={tx("acessibilidade")} title={tx("acessibilidade")} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-[#ffd75e] to-[#f5a50f] px-3.5 text-sm font-bold text-[#2a1c12] shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.55)] ring-1 ring-[#e39a0b]/60 transition hover:brightness-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="4.5" r="1.8" />
                  <path d="M5 8.5c2.3.9 4.7 1.3 7 1.3s4.7-.4 7-1.3M12 9.8V14m0 0-3 6m3-6 3 6" />
                </svg>
                <span>{tx("acessibilidade")}</span>
              </button>
            )}
            {/* pesquisar usuários e notificações: no canto superior direito, no mural do dono e no de visitas */}
            {account && <AccountActions account={account} tone="dark" menu={false} />}
          </div>
        </nav>


        {/* o mural abre sempre inteiro; o botão e a roda do mouse aproximam, e com o quadro aproximado dá para arrastá-lo */}
        <div className="absolute inset-0">
        <PannableBoard ambient={boardImageS(look)} scene={look.wide ? { src: look.wide, extra: WIDE_EXTRA, blur: locked } : undefined} controlPos="right-[2.2vw] bottom-5" hideControls={locked} wideZoom={hasSelection ? 1.9 : 2.7}>
        <BoardCanvas items={items} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} locked={locked} onCompose={onCompose} onNotify={onNotify} contain>
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

        <div className={`pointer-events-none absolute bottom-0 z-10 flex items-end justify-center gap-3 px-[2.2vw] pb-5 ${look.wide ? "left-1/2 w-[min(100%,150dvh)] -translate-x-1/2 portrait:inset-x-0 portrait:left-0 portrait:w-auto portrait:translate-x-0" : "inset-x-0"}`}>
          {/* à esquerda da barra: o botão "+ pin" (Pins e Displays); "Novo mural" agora é a 1ª opção do menu do nome do mural */}
          {canAdd && <div aria-hidden className="w-[9.5rem] shrink-0" />}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <BadgeBar className="pointer-events-auto w-[min(46rem,100%)]" storeRight leading={canAdd ? <AddPinButton visitor={visitor} className="!size-14" /> : undefined} />
          </div>
          {/* à direita da barra ficam os botões + e − do zoom */}
          {canAdd && <div aria-hidden className="w-[9.5rem] shrink-0" />}
        </div>
        </div>
      </div>
    </div>
  );
}