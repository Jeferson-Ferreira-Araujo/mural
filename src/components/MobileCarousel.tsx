"use client";

import { boardById } from "@/lib/boards";
import { BoardCanvas } from "./board/BoardCanvas";
import { PannableBoard } from "./board/PannableBoard";
import { Brand } from "./Brand";
import { AccountActions } from "./account/AccountActions";
import { MuralSwitcher } from "./MuralSwitcher";
import { MobileMural } from "./MobileMural";
import type { ViewProps } from "./viewProps";

/**
 * Celular/tablet (retrato).
 * - Mural desbloqueado: tela do mural (`MobileMural`), como no mockup.
 * - Tela inicial e mural trancado: logo, busca/pergunta no centro; "Acessar meu mural" e "Criar novo mural" no rodapé.
 * - Demonstração (sem dono): os controles e, abaixo, o mesmo quadro arrastável.
 */
export function MobileCarousel({ items, plan, locked, hasSelection, unlocked, panel, onCompose, landing = false, opening = false, board, capacity, muralInfo, onChangeMural, welcome, account, guestNext, muralSwitch, share, onNotify }: ViewProps) {
  const look = boardById(board);
  const bgX = look.cork.left + look.cork.width / 2;
  const bgY = look.cork.top + look.cork.height / 2;

  // mural escolhido (aberto ou trancado): sempre a tela do mural; se estiver trancado, o quadro fica borrado e a pergunta aparece por cima
  if (!landing && hasSelection && muralInfo) {
    return <MobileMural locked={locked} lockPanel={locked ? panel("dark") : undefined} items={items} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} onCompose={onCompose} info={muralInfo} onChangeMural={onChangeMural} welcome={welcome} account={account} guestNext={guestNext} muralSwitch={muralSwitch} share={share} onNotify={onNotify} />;
  }

  // abrindo um mural pelo endereço: tela escura e vazia até ele chegar (sem piscar a tela de busca)
  if (opening) return <div aria-busy className="min-h-dvh bg-[#140c06]" />;

  const demoBoard = !landing && hasSelection && unlocked && !locked; // sem muralInfo = demonstração

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
      {account && <AccountActions account={account} tone="dark" className="absolute top-3 right-3 z-20" />}
      <main className="mx-auto flex min-h-dvh max-w-4xl flex-col pt-4 pb-6 [font-size:16px]">
        <div className={`flex flex-1 flex-col transition-[gap] duration-500 ${landing ? "justify-center gap-6" : "gap-4"}`}>
          <header className="rise mx-auto flex w-[min(90vw,30rem)] flex-col items-center gap-3">
            <h1 className="sr-only">Pinz</h1>
            <Brand className={`transition-[height] duration-500 ease-out ${landing ? "h-[clamp(9rem,27vh,13rem)]" : "h-[4.6rem]"}`} />
            {landing && <p className="intro-form text-center font-[family-name:var(--font-fredoka)] text-[1.2rem] leading-tight font-semibold tracking-wide text-[#f6efe2] [text-shadow:0_0.1em_0.5em_rgba(0,0,0,.6)]">Seu mural de momentos compartilhados.</p>}
          </header>

          {/* busca, escolha do mural e pergunta de desbloqueio (e os controles da demonstração) */}
          <div className="mx-auto w-[min(90vw,30rem)] text-[15px] md:text-[16px]">{panel("dark")}</div>
          <MuralSwitcher sw={muralSwitch} className="mx-auto" />

          {demoBoard && (
            <div className="mx-auto w-[min(94vw,36rem)] space-y-3">
              <div className="h-[68dvh] overflow-hidden rounded-2xl border border-white/15 shadow-[0_0.8rem_2rem_rgba(0,0,0,.45)]">
                <PannableBoard ambient={look.image}>
                  <BoardCanvas items={items} plan={plan} board={board} capacity={capacity} hasSelection={hasSelection} unlocked={unlocked} onCompose={onCompose} contain />
                </PannableBoard>
              </div>
            </div>
          )}
        </div>

        {/* rodapé: os dois botões de conta, um abaixo do outro */}
      </main>
    </div>
  );
}
