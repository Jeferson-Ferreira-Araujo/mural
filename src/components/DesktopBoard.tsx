"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { boardById, DEFAULT_BOARD } from "@/lib/boards";
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
export const BOARD_IMAGE = boardById(DEFAULT_BOARD).image;

/**
 * Os 15 espaços fixos da lousa: grade de 5 colunas × 3 linhas, com inclinações de mural real.
 * A altura de cada linha é a do maior bloco dela (nada passa por cima do texto do vizinho) e a lousa NUNCA cresce:
 * se os blocos não couberem, tudo encolhe junto (veja `useFitScale`). 15 é o limite do produto.
 * No PINZ FREE só a primeira linha (5 espaços) está liberada.
 */
const TILT = [-3, 2, -2, 3, -2, 2, -1.5, 2.5, -2, 1.5, -2, 2.5, -3, 2, -2.5] as const;
/** Pequeno deslocamento por espaço (em em), só para não parecer uma tabela. */
const jitter = (i: number) => ({ dx: (((i * 37) % 7) - 3) * 0.14, dy: (((i * 53) % 5) - 2) * 0.1 });

/** Escala base do tamanho dos blocos (em cqw da lousa). */
const BASE_EM_CQW = 0.98;

/**
 * Descobre o quanto encolher os blocos para a grade caber na cortiça sem sobrepor.
 * Mede com a escala cheia; se a altura natural passar da cortiça, reduz proporcionalmente.
 */
function useFitScale(base: number, deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    const measure = () => {
      const prev = g.style.fontSize;
      g.style.fontSize = `max(5px, ${base}cqw)`; // escala cheia
      const need = g.scrollHeight;
      const have = g.clientHeight;
      g.style.fontSize = prev; // devolve o valor que o React aplicou
      const next = need > have + 1 ? Math.max(0.55, (have / need) * 0.985) : 1;
      setScale((prev) => (Math.abs(prev - next) > 0.004 ? next : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(g);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ref, scale };
}

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
  const { items, plan, showMeter, locked, hasSelection, unlocked, siteStats, board, share, panel, panelTitle, notice, onCompose, onNotify } = props;
  const available = slotsFor(plan);
  const look = boardById(board);
  const CORK = look.cork; // área útil deste quadro (em % da imagem 3:2)
  const baseEm = BASE_EM_CQW * look.size;
  const fit = useFitScale(baseEm, [items, baseEm]);

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
      <Sidebar siteStats={siteStats} panel={panel} panelTitle={panelTitle} plan={plan} used={items.length} showMeter={showMeter} notice={notice} />

      {/* bloco da direita: a lousa ocupa TODO o espaço; o topo e o botão ficam sobrepostos a ela */}
      <div className="relative min-w-0 flex-1 overflow-hidden">
        {/* ambiente: a mesma foto desfocada preenche as laterais */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={look.image} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-80 blur-2xl" />

        <nav aria-label="Informações do mural" className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 px-[2.2vw] pt-5">
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

        <main className="absolute inset-0 [container-type:size]">
          <div
            className="absolute top-1/2 left-1/2 aspect-[3/2] -translate-x-1/2 -translate-y-1/2 transition-[filter] duration-700 ease-out [container-type:inline-size]"
            style={{ // cobre o bloco inteiro (corta só o excedente da imagem), mas nunca a ponto de cortar a área de cortiça com os recados
              width: "min(max(100cqw, 150cqh), 123cqw, 192cqh)", filter: locked ? "blur(11px) saturate(0.85)" : "none" }}
            aria-hidden={locked}
            inert={locked}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={look.image} alt={`Mural: quadro ${look.name}`} className="absolute inset-0 size-full select-none" draggable={false} />

            <div
              className="absolute"
              style={{ left: `${CORK.left}%`, top: `${CORK.top + 2}%`, width: `${CORK.width}%`, height: `${CORK.height - 2.5}%`, fontSize: `max(5px, ${baseEm}cqw)` }}
            >
              <div
                ref={fit.ref}
                className="grid h-full grid-cols-5 content-evenly items-start justify-items-center"
                style={{ fontSize: `max(5px, ${(baseEm * fit.scale).toFixed(4)}cqw)`, gridTemplateRows: "repeat(3, auto)", rowGap: "1.5em", columnGap: "0.4em" }}
              >
                {Array.from({ length: BOARD_CAPACITY }, (_, i) => {
                  const item = items[i];
                  const tilt = TILT[i];
                  const { dx, dy } = jitter(i);

                  // espaço sem mensagem: livre (plano libera) ou bloqueado (plano não libera).
                  // No mural de exemplo (nenhum mural escolhido) não mostramos marcadores: só os cartões de amostra.
                  if (!item) {
                    if (!hasSelection) return <div key={`slot-${i}`} aria-hidden />;
                    return (
                      <div key={`slot-${i}`} style={{ transform: `rotate(${tilt * 0.5}deg)` }}>
                        {i < available ? <EmptySlot /> : <LockedSlot />}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className="pinned relative"
                      style={
                        {
                          zIndex: 2 + ((i * 7) % 5),
                          "--rot": `${tilt}deg`,
                          "--dx": `${dx}em`,
                          "--dy": `${dy}em`,
                          animationDelay: `${0.05 + i * 0.06}s`,
                        } as CSSProperties
                      }
                    >
                      <MessageView message={item} />
                    </div>
                  );
                })}
              </div>

              {items.length === 0 && unlocked && (
                <div className="absolute inset-x-0 top-[45%] z-10">
                  <EmptyNote unlocked={unlocked} />
                </div>
              )}
            </div>
          </div>
          {locked && <LockedNotice hasSelection={hasSelection} />}
        </main>

        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 pb-5">
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
