"use client";

import { boardById, DEFAULT_BOARD, boardImageS, WIDE_EXTRA } from "@/lib/boards";
import { AddPinButton } from "./AddPinButton";
import { BOARD_CAPACITY } from "@/lib/plans";
import { BoardCanvas } from "./board/BoardCanvas";
import { PannableBoard } from "./board/PannableBoard";
import { AccountActions } from "./account/AccountActions";
import { Avatar } from "./Avatar";
import { BadgeBar } from "./badges/BadgeBar";
import { MuralNameMenu } from "./MuralNameMenu";
import { LockedNotice } from "./LockedNotice";
import { ShareButton } from "./ShareButton";
import { FollowButton } from "./FollowButton";
import { PlanLimit } from "./PlanLimit";
import { Sidebar } from "./Sidebar";
import type { ViewProps } from "./viewProps";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
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
  const visit = props.visit ?? null; // mural de outra pessoa: o menu lateral abre recolhido e a pessoa aparece no canto do mural
  const [collapsed, setCollapsed] = useState(false);
  const [clean, setClean] = useState(false); // mural limpo: esconde os botões flutuantes (o olho continua)
  const hide = clean ? "invisible opacity-0" : "";
  const reopenMenu = useRef(false); // o olho recolheu o menu lateral: ao mostrar os botões de novo, ele volta
  const toggleClean = () => {
    // teste: o olho também põe o navegador em tela cheia (e tira, no clique seguinte); o clique é o gesto que o navegador exige
    try {
      if (!clean) void document.documentElement.requestFullscreen?.().catch(() => undefined);
      else if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    } catch {}
    if (!clean) {
      reopenMenu.current = !collapsed;
      if (!collapsed) {
        setCollapsed(true); // sem gravar a preferência: é só enquanto o mural está limpo
        window.setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
      }
    } else {
      // restaurar a visão devolve também o menu lateral (sem gravar a preferência); visitando alguém, volta como estava (recolhido, em geral)
      const wasOpen = reopenMenu.current;
      reopenMenu.current = false;
      setCollapsed(visit ? !wasOpen : false);
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 500);
    }
    setClean(!clean);
  };
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);
  // ao entrar no mural de outra pessoa o menu lateral recolhe (mural em tela cheia); ao voltar ao próprio, volta ao que a pessoa tinha escolhido
  const visitNick = visit?.nick ?? null;
  const wasVisiting = useRef(false);
  useEffect(() => {
    if (visitNick) {
      wasVisiting.current = true;
      setCollapsed(true);
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
    } else if (wasVisiting.current) {
      wasVisiting.current = false;
      try {
        setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
      } catch {}
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
    }
  }, [visitNick]);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      if (!visit) localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); // visitando: a escolha vale só para esta visita
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
          className={`absolute top-1/2 left-0 z-30 grid h-16 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-r-xl bg-[#fbf6ea]/95 text-[#4a3826] shadow-[0_0.3rem_1rem_rgba(0,0,0,.35)] transition hover:w-7 hover:bg-white portrait:hidden focus-visible:outline-2 focus-visible:outline-[#d98a2b]`}
        >
          <svg viewBox="0 0 24 24" className={`size-4 transition-transform ${collapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>

        <div className={`relative h-full shrink-0 overflow-hidden portrait:h-auto portrait:w-[min(100%,78dvh)] portrait:aspect-[3/2] ${look.wide ? "w-full" : "w-[min(100%,150dvh)]"}`}>

        <nav aria-label={tx("informacoesDoMural")} className={`${hide} pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 px-[2.2vw] pt-5 transition-opacity`}>
          <div className="pointer-events-auto flex min-h-11 min-w-0 items-center gap-2">
            {/* mural de outra pessoa, menu lateral recolhido: foto e @ (com o menu aberto, eles já aparecem nele), depois Seguir e os murais da pessoa */}
            {visit && collapsed && !locked && (
              <div className="flex h-11 min-w-0 shrink-0 items-center gap-2 rounded-xl bg-[#fbf6ea] py-1 pr-4 pl-1.5 text-sm font-semibold text-[#2a1c12] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.3)]">
                <Avatar src={visit.avatar} name={visit.nick} plus={visit.plus} className="size-8" />
                <span className="max-w-[16vw] truncate">@{visit.nick}</span>
              </div>
            )}
            {visit && hasSelection && !locked && props.follow && <FollowButton follow={props.follow} />}
            {/* nome do mural: pílula igual à do botão Pesquisar usuários, alinhada à esquerda */}
            {hasSelection && (!locked || !!visit) && props.muralInfo?.title && (
              <h2 className="grid h-11 max-w-[42vw] place-items-center rounded-xl bg-[#fbf6ea] px-5 text-sm font-semibold text-[#2a1c12] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.3)]">
                <MuralNameMenu title={props.muralInfo.title} sw={muralSwitch} showShared={!!account?.atHome} onCreate={newMural} />
              </h2>
            )}
            {hasSelection && !locked && unlocked && account?.atHome && plan === "free" && <PlanLimit used={items.length} />}
            {!visit && hasSelection && !locked && props.follow && <FollowButton follow={props.follow} />}
            {/* convida outras pessoas a ver este mural */}
            {hasSelection && share && (
              <ShareButton reward iconOnly title={tx("convidarPessoasParaVerEste")} text={share.text} path={share.path} onNotify={onNotify} className="shrink-0 bg-[#fbf6ea] text-[#2a1c12] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.3)] hover:bg-white" />
            )}
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            {/* o botão de acessibilidade da tela de entrada mora na barra bege (Sidebar), no canto esquerdo, na linha do idioma */}
            {/* pesquisar usuários e notificações: no canto superior direito, no mural do dono e no de visitas */}
            {account && <AccountActions account={account} tone="dark" menu={false} />}
          </div>
        </nav>


        {/* o mural abre sempre inteiro; o botão e a roda do mouse aproximam, e com o quadro aproximado dá para arrastá-lo */}
        <div className="absolute inset-0">
        <PannableBoard ambient={boardImageS(look)} scene={look.wide ? { src: look.wide, extra: WIDE_EXTRA, blur: locked } : undefined} controlPos="right-[calc(2.2vw+3.5rem)] bottom-5" hintOnce={account ? undefined : "pinz:landing-hint-desktop"} eye={{ hidden: clean, onToggle: toggleClean, pos: "right-[2.2vw] bottom-5" }} hideControls={locked} wideZoom={hasSelection ? 1.9 : 2.7}>
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

        <div className={`${hide} pointer-events-none absolute bottom-0 z-10 flex items-end justify-center gap-3 px-[2.2vw] pb-5 transition-opacity ${look.wide ? "left-1/2 w-[min(100%,150dvh)] -translate-x-1/2 portrait:inset-x-0 portrait:left-0 portrait:w-auto portrait:translate-x-0" : "inset-x-0"}`}>
          {/* à esquerda da barra: o botão "+ pin" (Pins e Displays); "Novo mural" agora é a 1ª opção do menu do nome do mural */}
          <div aria-hidden className="w-[1.5rem] shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2" style={{ "--bb": "3.5rem" } as React.CSSProperties}>
            <BadgeBar className="pointer-events-auto w-[min(60rem,100%)]" storeRight leading={canAdd ? <AddPinButton visitor={visitor} className="!size-[var(--bb)]" /> : undefined} />
          </div>
          {/* à direita da barra ficam os botões + e − do zoom */}
          <div aria-hidden className="w-[13rem] shrink-0" />
        </div>
        </div>
      </div>
    </div>
  );
}