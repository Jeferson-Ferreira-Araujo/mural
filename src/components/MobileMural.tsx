"use client";

import { boardById } from "@/lib/boards";
import { slotsFor, type PlanId } from "@/lib/plans";
import type { BoardItem } from "@/lib/types";
import { Avatar } from "./Avatar";
import { BoardCanvas } from "./board/BoardCanvas";
import { PannableBoard } from "./board/PannableBoard";
import { Brand } from "./Brand";
import { AccountActions, GuestLinks, type AccountApi } from "./account/AccountActions";
import { BadgeBar } from "./badges/BadgeBar";
import { MuralSwitcher, type MuralSwitch } from "./MuralSwitcher";
import { useBadges } from "./badges/BadgeContext";

type Props = {
  items: BoardItem[];
  plan: PlanId;
  board?: string;
  capacity?: number;
  hasSelection: boolean;
  unlocked: boolean;
  onCompose: ((slot?: number) => void) | null;
  info: { title: string; owner: string; avatar?: string | null };
  /** "Procurar outro mural": volta à busca */
  onChangeMural?: () => void;
  /** texto do mural vazio (PLUS) */
  welcome?: string | null;
  /** logado: ícones de pesquisar e menu; sem conta: links de entrar */
  account?: AccountApi;
  guestNext?: string;
  muralSwitch?: MuralSwitch;
};

/** Botão principal de rodapé: deixar um pin. */
export function LeavePinButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#d9a21b] text-lg font-bold text-[#2a1c12] shadow-[0_0.5rem_1.4rem_rgba(120,70,0,.45)] transition hover:bg-[#e6ae22] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]"
    >
      <span aria-hidden className="text-2xl leading-none">+</span> Deixar um PIN
    </button>
  );
}

/**
 * Mural no celular (retrato), como no mockup: topo com o logo e o menu; cabeçalho com a foto e o nome de quem é o mural;
 * o quadro ocupa a tela e se navega arrastando (toque duplo amplia, botão "Ver tudo" afasta); "Deixar um PIN" no rodapé.
 */
export function MobileMural({ items, plan, board, capacity, hasSelection, unlocked, onCompose, info, onChangeMural, welcome, account, guestNext, muralSwitch }: Props) {
  const look = boardById(board);
  const { editable: editBadges } = useBadges();
  const limit = slotsFor(plan, capacity);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#2a1a0e]">
      {/* topo: logo + menu */}
      <header className="relative z-30 flex h-14 shrink-0 items-center justify-between bg-[#f2e8d3] px-4 shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.25)]">
        <h1 className="sr-only">Pinz</h1>
        <Brand className="h-10" />
        {account ? <AccountActions account={account} /> : guestNext ? <GuestLinks next={guestNext} /> : null}
      </header>

      {/* de quem é o mural + quantos PINZ */}
      <div className="relative z-20 flex shrink-0 items-center gap-3 bg-[#e8dcc2] px-4 py-2 shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.2)]">
        <Avatar src={info.avatar} name={info.owner} className="size-11" />
        <p className="min-w-0 flex-1">
          <span className="block truncate text-base leading-tight font-bold text-[#2a1c12]">{info.title}</span>
          <span className="block text-xs text-[#6b5440]">
            {items.length} de {limit} PINZ · de {info.owner}
          </span>
        </p>
      </div>

      {/* o quadro: arrastar, pinçar, toque duplo */}
      <div className="relative min-h-0 flex-1">
        <PannableBoard ambient={look.image}>
          <BoardCanvas items={items} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} onCompose={onCompose} contain emptyMessage={welcome} />
        </PannableBoard>
      </div>

      {/* rodapé: deixar um pin (visitante) ou a barra de pins decorativos (dono) */}
      {(onCompose || editBadges || (muralSwitch && muralSwitch.items.length > 1)) && (
        <footer className="relative z-20 flex shrink-0 flex-col items-center gap-2.5 bg-[#f2e8d3] px-4 pt-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] shadow-[0_-0.2rem_0.8rem_rgba(0,0,0,.25)]">
          <MuralSwitcher sw={muralSwitch} className="!bg-[#2a1c12]" />
          {editBadges && <BadgeBar className="w-full !border-[#d9c9ad] !bg-[#2a1c12]" />}
          {onCompose && (
            <div className="w-full">
              <LeavePinButton onClick={() => onCompose()} />
            </div>
          )}
        </footer>
      )}
    </div>
  );
}
