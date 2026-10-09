"use client";

import type { ReactNode } from "react";
import { boardById } from "@/lib/boards";
import type { PlanId } from "@/lib/plans";
import type { BoardItem } from "@/lib/types";
import { Avatar } from "./Avatar";
import { BoardCanvas } from "./board/BoardCanvas";
import { PannableBoard } from "./board/PannableBoard";
import { Brand } from "./Brand";
import { GuestLinks, MobileHeaderLeft, MobileHeaderRight, type AccountApi } from "./account/AccountActions";
import { BadgeBar } from "./badges/BadgeBar";
import { ShareButton } from "./ShareButton";
import { MuralNameMenu } from "./MuralNameMenu";
import { FollowButton } from "./FollowButton";
import type { ViewProps } from "./viewProps";
import type { MuralSwitch } from "./MuralSwitcher";
import { useBadges } from "./badges/BadgeContext";

type Props = {
  items: BoardItem[];
  plan: PlanId;
  board?: string;
  capacity?: number;
  hasSelection: boolean;
  unlocked: boolean;
  onCompose: ((slot?: number) => void) | null;
  info: { title: string; owner: string; avatar?: string | null; plus?: boolean; /** seguidores da pessoa (só o número); null = não mostrar */ followers?: number | null };
  /** "Procurar outro mural": volta à busca */
  onChangeMural?: () => void;
  /** texto do mural vazio (PLUS) */
  welcome?: string | null;
  /** logado: ícones de pesquisar e menu; sem conta: links de entrar */
  account?: AccountApi;
  guestNext?: string;
  muralSwitch?: MuralSwitch;
  /** mural trancado por pergunta: o quadro fica borrado e este cartão (pergunta + resposta) aparece por cima */
  locked?: boolean;
  lockPanel?: ReactNode;
  /** convite para ver o mural: botão "Compartilhar" no canto inferior esquerdo do quadro */
  share?: { title: string; text?: string; path: string } | null;
  /** seguir a pessoa (só em mural de outra pessoa) */
  follow?: ViewProps["follow"];
  onNotify?: (msg: string) => void;
};

/**
 * Mural no celular (retrato), como no mockup: topo com o logo e o menu; cabeçalho com a foto e o nome de quem é o mural;
 * o quadro ocupa a tela e se navega arrastando (toque duplo amplia, botão "Afastar" afasta); para deixar um pin, toca-se no espaço vazio do quadro.
 */
export function MobileMural({ items, plan, board, capacity, hasSelection, unlocked, onCompose, info, onChangeMural, account, guestNext, muralSwitch, locked = false, lockPanel, share, follow, onNotify }: Props) {
  const look = boardById(board);
  const { editable: editBadges } = useBadges();

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#2a1a0e]">
      {/* topo: logo + menu */}
      <header className={`relative z-30 h-14 shrink-0 items-center bg-[#f2e8d3] px-4 shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.25)] ${account ? "grid grid-cols-[1fr_auto_1fr]" : "flex justify-between"}`}>
        <h1 className="sr-only">Pinz</h1>
        {account ? (
          <>
            <MobileHeaderLeft account={account} />
            <Brand className="h-10" />
            <div className="flex justify-end">
              <MobileHeaderRight account={account} />
            </div>
          </>
        ) : (
          <>
            <Brand className="h-10" />
            {guestNext ? <GuestLinks next={guestNext} /> : null}
          </>
        )}
      </header>

      {/* de quem é o mural + quantos PINZ */}
      <div className="relative z-20 flex shrink-0 items-center gap-3 bg-[#e8dcc2] px-4 py-2 shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.2)]">
        <Avatar src={info.avatar} name={info.owner} plus={info.plus} className="size-11" />
        <p className="min-w-0 flex-1">
          <span className="block truncate text-base leading-tight font-bold text-[#2a1c12]">@{info.owner}</span>
        </p>
        {/* à direita, na linha da foto: no mural de outra pessoa o botão Seguir/Seguindo; no seu, quantos seguidores você tem */}
        {follow ? (
          <FollowButton follow={follow} compact />
        ) : !locked && info.followers != null ? (
          <p className="shrink-0 text-right text-sm leading-tight text-[#2a1c12]">
            <strong className="block text-base">{info.followers.toLocaleString("pt-BR")}</strong>
            {info.followers === 1 ? "seguidor" : "seguidores"}
          </p>
        ) : null}
      </div>


      {/* o quadro: arrastar, pinçar, toque duplo */}
      <div className="relative min-h-0 flex-1">
        {/* escolher o mural: canto superior direito do quadro, na linha do Novo mural */}
        <div className="absolute top-3 right-3 z-30">
          <MuralNameMenu
            title={info.title}
            label="Murais"
            sw={muralSwitch}
            showShared={!!account?.atHome}
            align="right"
            triggerClassName="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#17110c]/85 px-4 text-sm font-semibold text-white shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]"
          />
        </div>
        {/* PLUS: novo mural, no canto superior esquerdo do quadro (mesmo estilo do botão Compartilhar) */}
        {account?.onNewMural && (
          <button
            type="button"
            onClick={account.onNewMural}
            className="absolute top-3 left-3 z-20 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#17110c]/85 px-4 text-sm font-semibold text-white shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo mural
          </button>
        )}
        <PannableBoard
          hideControls={locked}
          ambient={look.image}
          cornerLeft={
            share && onNotify ? (
              <ShareButton
                title="Compartilhar este mural"
                text={share.text}
                path={share.path}
                onNotify={onNotify}
                className="h-11 gap-2 bg-[#17110c]/85 px-4 text-white shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur"
                label="Compartilhar"
              />
            ) : undefined
          }
        >
          <BoardCanvas items={items} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} locked={locked} onCompose={onCompose} contain />
        </PannableBoard>
        {locked && lockPanel && (
          <div className="absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-black/30 p-4">
            <div className="w-[min(92vw,28rem)] text-[15px]">{lockPanel}</div>
          </div>
        )}
      </div>

      {/* rodapé: deixar um pin (visitante) ou a barra de pins decorativos (dono) */}
      {editBadges && (
        <footer className="relative z-20 flex shrink-0 flex-col items-center gap-2.5 bg-[#f2e8d3] px-4 pt-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] shadow-[0_-0.2rem_0.8rem_rgba(0,0,0,.25)]">
          {editBadges && <BadgeBar className="w-full !border-[#d9c9ad] !bg-[#2a1c12]" />}
        </footer>
      )}
    </div>
  );
}
