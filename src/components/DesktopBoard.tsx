"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { filters, type FilterId, type Message } from "@/lib/types";
import { EmptyNote } from "./EmptyNote";
import { LockedNotice } from "./LockedNotice";
import { MessageView } from "./messages/MessageView";
import { ShareButton } from "./ShareButton";
import { Sidebar } from "./Sidebar";
import type { ViewProps } from "./viewProps";

/** Imagem da lousa (desktop). Original em /imagens/quadro-desktop.png; versão otimizada servida daqui. */
export const BOARD_IMAGE = "/img/quadro-desktop.webp";

/** Área útil de cortiça dentro da imagem (em % da imagem 3:2). */
const CORK = { left: 11.2, top: 8, width: 79.4, height: 76.2 };

/** Posições (x, y em % da cortiça; rotação em graus) de cada "slot" do mural: grade 4×3 levemente bagunçada. */
const SLOTS = [
  { x: 2, y: 2, rot: -3 }, { x: 27, y: 0.5, rot: 2 }, { x: 52, y: 2, rot: -2 }, { x: 76, y: 1.5, rot: 3 },
  { x: 1, y: 33, rot: 2 }, { x: 26.5, y: 32, rot: -1.5 }, { x: 51.5, y: 32.5, rot: 3 }, { x: 75.5, y: 32, rot: -2 },
  { x: 2, y: 63, rot: -2 }, { x: 27, y: 64, rot: 2.5 }, { x: 52, y: 63, rot: -3 }, { x: 76, y: 62.5, rot: 2 },
];
/** Com poucas mensagens (filtros), elas ficam no miolo do mural. */
const CENTER_SLOTS = [5, 6, 9, 10];

function layout(items: Message[]) {
  const order = items.length <= 4 ? CENTER_SLOTS : SLOTS.map((_, i) => i);
  return items.map((m, i) => ({ m, slot: SLOTS[order[i % order.length]], z: 2 + ((i * 7) % 5) }));
}

/** Foca o primeiro campo de busca/resposta visível (usado pelo botão "Deixar uma mensagem"). */
function focusFirstField() {
  const fields = Array.from(document.querySelectorAll<HTMLElement>("[data-focus-target]"));
  fields.find((el) => el.offsetParent !== null)?.focus();
}

/**
 * Mural físico completo. O container usa `container-type: inline-size`
 * e todos os tamanhos derivam de `cqw`, então o mural escala por inteiro.
 * Fica desfocado até a pessoa acertar a pergunta de desbloqueio.
 */
export function DesktopBoard({ messages, locked, hasSelection, unlocked, stats, share, panel, onNotify }: ViewProps) {
  const [filter, setFilter] = useState<FilterId>("all");

  const placed = useMemo(() => {
    const types = filters.find((f) => f.id === filter)?.types;
    const visible = types ? messages.filter((m) => (types as readonly string[]).includes(m.type)) : messages;
    return layout(visible);
  }, [messages, filter]);

  function addMessage() {
    if (!unlocked) {
      focusFirstField();
      onNotify(hasSelection ? "Responda a pergunta para desbloquear o mural." : "Procure alguém pelo nickname primeiro.");
      return;
    }
    onNotify("Em breve: aqui você poderá deixar sua mensagem anônima.");
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#3b2616]">
      <Sidebar stats={stats} panel={panel} />

      <div className="relative grid min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        {/* ambiente: a mesma foto desfocada preenche as laterais */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BOARD_IMAGE} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-80 blur-2xl" />

        <nav aria-label="Filtrar mensagens" className="relative z-10 flex items-center justify-between gap-4 px-[3vw] pt-5">
          <div
            role="tablist"
            inert={locked}
            className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-[#2a1c12]/70 p-1.5 shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.35)] backdrop-blur-md"
          >
            {filters.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#f7f0dd] ${
                  filter === f.id ? "bg-[#fbf6ea] text-[#2a1c12] shadow" : "text-[#f1e6d0]/85 hover:bg-white/10"
                }`}
              >
                {f.label}
              </button>
            ))}
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
                fontSize: "max(6px, 1.1cqw)",
              }}
            >
              {placed.length === 0 && (
                <div className="absolute inset-x-0 top-[22%]">
                  <EmptyNote unlocked={unlocked} />
                </div>
              )}
              {placed.map(({ m, slot, z }, i) => (
                <div
                  key={m.id}
                  className="pinned absolute"
                  style={
                    {
                      left: `${slot.x}%`,
                      top: `${slot.y}%`,
                      zIndex: z,
                      "--rot": `${slot.rot}deg`,
                      animationDelay: `${0.05 + i * 0.06}s`,
                    } as CSSProperties
                  }
                >
                  <MessageView message={m} />
                </div>
              ))}
            </div>
          </div>
          {locked && <LockedNotice hasSelection={hasSelection} />}
        </main>

        <div className="relative z-10 flex justify-center pt-1 pb-5">
          <button
            type="button"
            onClick={addMessage}
            className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-[#fbf6ea] py-2.5 pr-7 pl-2.5 text-base font-semibold text-[#2a1c12] shadow-[0_0.6rem_1.6rem_rgba(0,0,0,.4)] transition hover:-translate-y-0.5 hover:bg-white active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]"
          >
            <span className="grid size-9 place-items-center rounded-full bg-[#1f232b] text-xl leading-none text-white">+</span>
            Deixar uma mensagem anônima
          </button>
        </div>
      </div>
    </div>
  );
}
