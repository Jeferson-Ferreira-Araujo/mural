"use client";

import { useRef, useState, type ReactNode } from "react";
import { AddPinButton } from "./AddPinButton";
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
import { PlanBadge } from "./board/PlanBadge";
import { PAY_EVENT } from "@/lib/payments";
import { PAYMENTS_ENABLED } from "@/lib/plans";
import { PlanLimit } from "./PlanLimit";
import { FollowersModal } from "./account/PeopleModals";
import type { ViewProps } from "./viewProps";
import type { MuralSwitch } from "./MuralSwitcher";
import { useFeatureFlags } from "@/lib/features";
import { useBadges } from "./badges/BadgeContext";

type Props = {
  items: BoardItem[];
  plan: PlanId;
  board?: string;
  capacity?: number;
  hasSelection: boolean;
  unlocked: boolean;
  onCompose: ((slot?: number) => void) | null;
  info: { title: string; owner: string; avatar?: string | null; plus?: boolean; /** seguidores da pessoa (só o número); null = não mostrar */ followers?: number | null; topFollowers?: { nickname: string; avatar: string | null; plus?: boolean }[]; /** tocar na foto/nome abre o resumo do perfil */ onProfile?: () => void };
  /** "Procurar outro mural": volta à busca */
  onChangeMural?: () => void;
  /** texto do mural vazio (PINZ+) */
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
  const shareTop = !!(account?.onNewMural || account?.atHome); // dono no próprio mural: Compartilhar fica no canto superior esquerdo
  const canAdd = unlocked && !locked && hasSelection && !!onCompose; // botão "+ pin": o dono no próprio mural e quem visita um mural desbloqueado
  const look = boardById(board);
  const flags = useFeatureFlags();
  const swipeOn = flags.mural_swipe === true; // trocar de mural arrastando: desligado por padrão (o administrador liga em Recursos)
  const { editable: editBadges } = useBadges();
  const [followersOpen, setFollowersOpen] = useState(false);
  const swipeTarget = useRef<{ from: string; to: string } | null>(null);

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
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button type="button" onClick={info.onProfile} disabled={!info.onProfile} aria-label={`Ver o perfil de @${info.owner}`} className="shrink-0 cursor-pointer transition active:scale-95 disabled:cursor-default">
            <Avatar src={info.avatar} name={info.owner} plus={info.plus} className="size-11" />
          </button>
          <span className="flex min-w-0 flex-col items-start gap-1">
            <button type="button" onClick={info.onProfile} disabled={!info.onProfile} className="block max-w-full min-w-0 cursor-pointer truncate text-left text-base leading-tight font-bold text-[#2a1c12] transition active:scale-[0.98] disabled:cursor-default">
              @{info.owner}
            </button>
            {info.plus && <PlanBadge plan="full" className="!px-2 !py-0.5 !text-[10px]" />}
            {/* conta FREE no próprio mural: atalho para assinar o PINZ+ mensal */}
            {account?.atHome && plan === "free" && PAYMENTS_ENABLED && (
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(PAY_EVENT, { detail: { product: "plus" } }))} className="cursor-pointer rounded-lg bg-gradient-to-r from-[#f2c230] to-[#e39a1c] px-2.5 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap text-[#3a2300] uppercase shadow-[0_0.1rem_0.4rem_rgba(150,90,0,.35)] transition active:scale-95">
                Assinar PINZ+
              </button>
            )}
          </span>
        </div>
        {/* à direita, na linha da foto: quantos seguidores a pessoa tem (o botão Seguir fica sobre o quadro) */}
        {!locked && info.followers != null && (
          <button type="button" onClick={() => setFollowersOpen(true)} aria-label="Ver os seguidores" className="shrink-0 cursor-pointer text-center text-[#2a1c12] transition active:scale-95">
            <span className="flex items-center justify-end gap-2">
              {!!info.topFollowers?.length && (
                <span className="flex -space-x-2" aria-hidden>
                  {info.topFollowers.map((p) => (
                    <Avatar key={p.nickname} src={p.avatar} name={p.nickname} className="size-6 !border ring-1 ring-[#e8dcc2]" />
                  ))}
                </span>
              )}
              <strong className="text-lg leading-none font-bold">{info.followers.toLocaleString("pt-BR")}</strong>
            </span>
            <span className="mt-0.5 block text-right text-[11px] leading-tight text-[#6b5440]">{info.followers === 1 ? "seguidor" : "seguidores"}</span>
          </button>
        )}
      </div>


      <FollowersModal open={followersOpen} onClose={() => setFollowersOpen(false)} nick={info.owner} />

      {/* o quadro: arrastar, pinçar, toque duplo */}
      <div className="relative min-h-0 flex-1">
        {/* escolher o mural: sempre no canto superior direito (o esquerdo é do Novo mural no seu perfil, ou do Seguir ao visitar) */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          {/* conta FREE no próprio mural: contador de pins e explicação do limite, na mesma linha do botão de murais */}
          {account?.atHome && plan === "free" && unlocked && !locked && <PlanLimit used={items.length} glass />}
          <MuralNameMenu
            title={info.title}
            label={account?.onNewMural ? "Meus murais" : "Murais"}
            onCreate={account?.onNewMural}
            sw={muralSwitch}
            showShared={!!account?.atHome}
            align="right"
            triggerClassName="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#17110c]/85 px-4 text-sm font-semibold text-white shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]"
          />
        </div>
        {follow && <FollowButton follow={follow} glass className="absolute top-3 left-3 z-20" />}
        {/* PINZ+: Compartilhar sobe para o canto superior esquerdo (o "novo mural" agora é a 1ª opção do menu Meus murais) */}
        {shareTop && share && onNotify && !follow && (
          <div className="absolute top-3 left-3 z-20">
            <ShareButton reward title="Compartilhar este mural" text={share.text} path={share.path} onNotify={onNotify} className="h-11 gap-2 bg-[#17110c]/85 px-4 text-white shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur" label="Compartilhar" />
          </div>
        )}
        <PannableBoard
          hideControls={locked}
          startZoomed={!locked}
          onSwipe={swipeOn && muralSwitch && muralSwitch.items.length > 1 ? (dir) => {
            // parte do último mural pedido (a tela pode ainda não ter trocado se o dedo seguiu arrastando)
            const from = swipeTarget.current?.from === muralSwitch.current ? swipeTarget.current.to : muralSwitch.current;
            const i = Math.max(0, muralSwitch.items.findIndex((m) => m.slug === from));
            const to = muralSwitch.items[(i + dir + muralSwitch.items.length) % muralSwitch.items.length].slug;
            swipeTarget.current = { from: muralSwitch.current, to };
            muralSwitch.onSelect(to);
          } : undefined}
          ambient={look.image}
          cornerLeft={
            canAdd || (share && onNotify && !shareTop) ? (
              <div className="flex items-center gap-2">
                {canAdd && <AddPinButton visitor={!account?.atHome} />}
                {share && onNotify && !shareTop && (
                  <ShareButton reward title="Compartilhar este mural" text={share.text} path={share.path} onNotify={onNotify} className="h-11 gap-2 bg-[#17110c]/85 px-4 text-white shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur" label="Compartilhar" />
                )}
              </div>
            ) : undefined
          }
        >
          <BoardCanvas items={items} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} locked={locked} onCompose={onCompose} onNotify={onNotify} contain />
        </PannableBoard>
        {locked && lockPanel && (
          <div className="absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-black/30 p-4">
            <div className="w-[min(92vw,28rem)] text-[15px]">{lockPanel}</div>
          </div>
        )}
      </div>

      {/* rodapé: deixar um pin (visitante) ou a barra de pins decorativos (dono) */}
      {editBadges && (
        <footer className="relative z-20 flex shrink-0 flex-col items-center gap-2.5 px-4 pt-2 pb-[max(0.9rem,env(safe-area-inset-bottom))]">
          {editBadges && <BadgeBar hideRewards className="w-full !bg-[#2a1c12]/80" />}
        </footer>
      )}
    </div>
  );
}
