"use client";

import type { CSSProperties } from "react";
import { BOARD_CAPACITY, slotsFor } from "@/lib/plans";
import { EmptyNote } from "./EmptyNote";
import { EmptySlot, LockedSlot } from "./board/SlotMarker";
import { PlanBadge } from "./board/PlanBadge";
import { LockedNotice } from "./LockedNotice";
import { MessageView } from "./messages/MessageView";
import { ShareButton } from "./ShareButton";
import { Sidebar } from "./Sidebar";
import type { ViewProps } from "./viewProps";

/** Imagem da lousa (desktop). Original em /imagens/quadro-desktop.png; versão otimizada servida daqui. */
export const BOARD_IMAGE = "/img/quadro-desktop.webp";

/** Área útil de cortiça dentro da imagem (em % da imagem 3:2). */
const CORK = { left: 11.2, top: 8, width: 79.4, height: 76.2 };

/**
 * Os 15 espaços fixos da lousa (5 colunas × 3 linhas), com leve "bagunça" de mural real.
 * x/y em % da cortiça; rot em graus. A lousa NUNCA cresce: 15 é o limite do produto.
 * No PINZ FREE só a primeira linha (5 espaços) está liberada.
 */
const SLOTS = [
  { x: 0.8, y: 1.5, rot: -3 }, { x: 20.8, y: 0.5, rot: 2 }, { x: 40.8, y: 2, rot: -2 }, { x: 60.8, y: 0.8, rot: 3 }, { x: 80.5, y: 1.8, rot: -2 },
  { x: 1.6, y: 34, rot: 2 }, { x: 20.6, y: 33, rot: -1.5 }, { x: 41, y: 34.5, rot: 2.5 }, { x: 61, y: 33.2, rot: -2 }, { x: 80.2, y: 34, rot: 1.5 },
  { x: 0.8, y: 66, rot: -2 }, { x: 21.2, y: 66.8, rot: 2.5 }, { x: 40.6, y: 65.6, rot: -3 }, { x: 61.2, y: 66.4, rot: 2 }, { x: 80.6, y: 65.8, rot: -2.5 },
] as const;

/** Foca o primeiro campo de busca/resposta visível (usado pelo botão "Deixar uma mensagem"). */
function focusFirstField() {
  const fields = Array.from(document.querySelectorAll<HTMLElement>("[data-focus-target]"));
  fields.find((el) => el.offsetParent !== null)?.focus();
}

/**
 * Mural físico completo: 15 espaços fixos numa lousa que não cresce.
 * O container usa `container-type: inline-size` e todos os tamanhos derivam de `cqw`.
 * Fica desfocado até a pessoa acertar a pergunta de desbloqueio.
 */
export function DesktopBoard(props: ViewProps) {
  const { items, plan, showMeter, locked, hasSelection, unlocked, stats, share, panel, panelTitle, notice, onCompose, onNotify } = props;
  const available = slotsFor(plan);

  function addMessage() {
    if (!unlocked) {
      focusFirstField();
      onNotify(hasSelection ? "Responda a pergunta para desbloquear o mural." : "Procure alguém pelo nickname primeiro.");
      return;
    }
    onCompose?.();
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#3b2616]">
      <Sidebar stats={stats} panel={panel} panelTitle={panelTitle} plan={plan} used={items.length} showMeter={showMeter} notice={notice} />

      <div className="relative grid min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        {/* ambiente: a mesma foto desfocada preenche as laterais */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BOARD_IMAGE} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-80 blur-2xl" />

        <nav aria-label="Informações do mural" className="relative z-10 flex items-center justify-between gap-4 px-[3vw] pt-5">
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

        <main className="relative [container-type:size]">
          <div
            className="absolute top-1/2 left-1/2 aspect-[3/2] -translate-x-1/2 -translate-y-1/2 transition-[filter] duration-700 ease-out [container-type:inline-size]"
            style={{ width: "min(100cqw, 150cqh)", filter: locked ? "blur(11px) saturate(0.85)" : "none" }}
            aria-hidden={locked}
            inert={locked}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BOARD_IMAGE} alt="Mural de cortiça com moldura de madeira" className="absolute inset-0 size-full select-none" draggable={false} />

            <div
              className="absolute"
              style={{
                left: `${CORK.left}%`,
                top: `${CORK.top}%`,
                width: `${CORK.width}%`,
                height: `${CORK.height}%`,
                fontSize: "max(5px, 0.98cqw)",
              }}
            >
              {Array.from({ length: BOARD_CAPACITY }, (_, i) => {
                const slot = SLOTS[i];
                const item = items[i];
                const pos: CSSProperties = { left: `${slot.x}%`, top: `${slot.y}%` };

                // espaço sem mensagem: livre (plano libera) ou bloqueado (plano não libera)
                if (!item) {
                  return (
                    <div key={`slot-${i}`} className="absolute" style={{ ...pos, transform: `rotate(${slot.rot * 0.5}deg)` }}>
                      {i < available ? <EmptySlot /> : <LockedSlot />}
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className="pinned absolute"
                    style={
                      {
                        ...pos,
                        zIndex: 2 + ((i * 7) % 5),
                        "--rot": `${slot.rot}deg`,
                        animationDelay: `${0.05 + i * 0.06}s`,
                      } as CSSProperties
                    }
                  >
                    <MessageView message={item} />
                  </div>
                );
              })}

              {items.length === 0 && unlocked && (
                <div className="absolute inset-x-0 top-[45%] z-10">
                  <EmptyNote unlocked={unlocked} />
                </div>
              )}
            </div>
          </div>
          {locked && <LockedNotice hasSelection={hasSelection} />}
        </main>

        <div className="relative z-10 flex flex-col items-center gap-2 pt-1 pb-5">
          {onCompose && (
            <button
              type="button"
              onClick={addMessage}
              className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-[#fbf6ea] py-2.5 pr-7 pl-2.5 text-base font-semibold text-[#2a1c12] shadow-[0_0.6rem_1.6rem_rgba(0,0,0,.4)] transition hover:-translate-y-0.5 hover:bg-white active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]"
            >
              <span className="grid size-9 place-items-center rounded-full bg-[#1f232b] text-xl leading-none text-white">+</span>
              Deixar uma mensagem anônima
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
