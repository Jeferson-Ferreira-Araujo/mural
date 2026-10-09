"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { typeLabel, isHidden, isSealed, type BoardItem } from "@/lib/types";
import { boardById } from "@/lib/boards";
import { gridFor, layoutSlots } from "@/lib/slots";
import { BOARD_CAPACITY, type PlanId } from "@/lib/plans";
import { MessageView } from "../messages/MessageView";
import { EmptySlot } from "./SlotMarker";
import { PinDetail } from "./PinDetail";
import { BadgeLayer } from "../badges/BadgeLayer";
import { useBadges } from "../badges/BadgeContext";
import { PHYSICAL_TYPES } from "@/lib/badges";
import { useModeration } from "./ModerationContext";
import { usePinDrag } from "./usePinDrag";

/**
 * Os 28 espaços fixos da lousa: grade de 7 colunas × 4 linhas (5 × 3 no quadro antigo de 15), com inclinações de mural real.
 * A altura de cada linha é a do maior bloco dela (nada passa por cima do texto do vizinho) e a lousa NUNCA cresce:
 * se os blocos não couberem, tudo encolhe junto (veja `useFitScale`). 28 é o limite do produto.
 * No PINZ FREE os 15 primeiros espaços estão liberados; quem cola o pin escolhe o espaço.
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
function useFitScale(base: number, min: number, deps: unknown[]) {
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
      const next = need > have + 1 ? Math.max(min, (have / need) * 0.985) : 1;
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

/**
 * O quadro em si: imagem de fundo + os espaços (28 pins), tudo em `cqw` do contêiner. Usado no desktop e no visualizador de tela cheia do celular.
 * `children` fica por cima do quadro (ex.: aviso de mural bloqueado).
 */
export function BoardCanvas({
  items,
  plan,
  board,
  capacity = BOARD_CAPACITY,
  hasSelection,
  unlocked,
  locked = false,
  onCompose,
  hint = false,
  contain = false,
  children,
}: {
  items: BoardItem[];
  plan: PlanId;
  board?: string;
  capacity?: number;
  hasSelection: boolean;
  unlocked: boolean;
  locked?: boolean;
  onCompose: ((slot?: number) => void) | null;
  hint?: boolean;
  /** Texto do bilhete do mural vazio (personalizado pelo dono PINZ+). */
  /** Quadro inteiro visível (celular deitado), em vez de preencher o espaço cortando as bordas. */
  contain?: boolean;
  children?: ReactNode;
}) {
  const dense = capacity > 15; // quadro denso (28): cards pequenos, clique no pin para ler
  const { cols, rows } = gridFor(capacity);
  const layout = layoutSlots(items, capacity); // cada pin no espaço escolhido por quem o colou
  // o detalhe (clique no pin) só existe para pins com conteúdo; espaços em blur não abrem nada
  const placed = layout.filter((x): x is BoardItem => !!x && !isHidden(x));
  const [detail, setDetail] = useState<number | null>(null);
  // pins que ainda não tinham aparecido neste quadro ganham a animação de entrada; os que só mudam de espaço, não
  const known = useRef(new Set<string>());
  const entering = useRef(new Set<string>());
  for (const it of items) {
    if (!known.current.has(it.id)) {
      known.current.add(it.id);
      entering.current.add(it.id);
    }
  }
  const mod = useModeration(); // só quem cuida do mural: pode arrastar os pins para outros espaços
  const { removeOver } = useBadges();
  const root = useRef<HTMLElement>(null);
  const drag = usePinDrag(
    mod
      ? (id, to) => {
          // pin de aparelho (vídeo, áudio, voz, local, cápsula) não pode ficar com botton por cima: os que estiverem na área de destino voltam para a barra
          const from = layout.findIndex((x) => x?.id === id);
          const slotEl = (n: number) => root.current?.querySelector<HTMLElement>(`[data-slot="${n}"]`) ?? null;
          const isPhysical = (it: BoardItem | null | undefined) => !!it && (isSealed(it) || (PHYSICAL_TYPES as readonly string[]).includes(it.type ?? ""));
          const over = (el: HTMLElement | null, size: HTMLElement | null) => {
            if (!el || !size) return;
            const c = el.getBoundingClientRect();
            const s = size.getBoundingClientRect();
            removeOver({ left: c.left + c.width / 2 - s.width / 2, right: c.left + c.width / 2 + s.width / 2, top: c.top + c.height / 2 - s.height / 2, bottom: c.top + c.height / 2 + s.height / 2 });
          };
          if (from >= 0 && isPhysical(layout[from])) over(slotEl(to), slotEl(from));
          if (isPhysical(layout[to])) over(slotEl(from), slotEl(to)); // quem estava no destino vai para o espaço de origem (troca)
          void mod.move(id, to);
        }
      : null,
  );
  const look = boardById(board);
  const CORK = look.cork; // área útil deste quadro (em % da imagem 3:2)
  const baseEm = BASE_EM_CQW * look.size * (dense ? 0.64 : 1); // denso: cards menores que a célula, para sobrar espaço entre os pins (no tablet ficavam colados)
  const fit = useFitScale(baseEm, dense ? 0.2 : 0.55, [items, baseEm, capacity]);

  return (
    <>
            <main ref={root} className="absolute inset-0 [container-type:size]">
              <div
                data-board-capture
                className="absolute top-1/2 left-1/2 aspect-[3/2] -translate-x-1/2 -translate-y-1/2 transition-[filter] duration-700 ease-out [container-type:inline-size]"
                style={{ // cobre o bloco inteiro (corta só o excedente da imagem), mas nunca a ponto de cortar a área de cortiça com os recados
                  width: contain ? "min(100cqw, 150cqh)" : "min(max(100cqw, 150cqh), 123cqw, 192cqh)", filter: locked ? "blur(11px) saturate(0.85)" : "none" }}
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
                    className="grid h-full content-evenly items-center justify-items-center"
                    style={{ fontSize: `max(5px, ${(baseEm * fit.scale).toFixed(4)}cqw)`, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, auto)`, rowGap: dense ? "1.4em" : "1.5em", columnGap: dense ? "1em" : "0.4em" }}
                  >
                    {Array.from({ length: capacity }, (_, i) => {
                      const item = layout[i];
                      const tilt = TILT[i % TILT.length];
                      const { dx, dy } = jitter(i);

                      // espaço sem mensagem: todos aparecem livres, em qualquer plano (o limite do plano é de QUANTOS pins, não de quais espaços).
                      // No mural de exemplo (nenhum mural escolhido) não mostramos marcadores: só os cartões de amostra.
                      if (!item) {
                        if (!hasSelection) return <div key={`e${i}`} aria-hidden />;
                        return (
                          <div key={`e${i}`} data-empty-slot data-slot={i} style={{ transform: `rotate(${tilt * 0.5}deg)` }}>
                            {onCompose && unlocked ? (
                              <button
                                type="button"
                                onClick={() => onCompose(i)}
                                aria-label={`Colar um pin na linha ${Math.floor(i / cols) + 1}, coluna ${(i % cols) + 1}`}
                                className={`block cursor-pointer rounded-[0.6em] transition hover:scale-105 hover:[&>div]:border-[#fff3d6] hover:[&>div]:bg-[#fff3d6]/40 focus-visible:outline-2 focus-visible:outline-offset-[0.2em] focus-visible:outline-[#f7f0dd] ${hint ? "animate-pulse" : ""}`}
                              >
                                <EmptySlot />
                              </button>
                            ) : (
                              <EmptySlot />
                            )}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`p${item.id}`} // chave pelo pin (não pelo espaço): ao mudar de lugar o pin chega pronto, sem a transição do espaço vazio
                          className={`pinned relative${entering.current.has(item.id) ? " enter" : ""}`}
                          data-slot={i}
                          data-pin-id={item.id}
                          // terminada a entrada, tira a classe: um pin movido de lugar no DOM (os vizinhos mudam de posição na lista) não pode repetir a animação
                          onAnimationEnd={(e) => e.target === e.currentTarget && e.currentTarget.classList.remove("enter")}
                          {...(mod ? { "data-pin-drag": "", onPointerDown: (e: React.PointerEvent) => drag.start(e, item.id, i) } : {})}
                          data-pin-type={isSealed(item) ? "capsule" : (item.type ?? "")}
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
                          {dense && !isHidden(item) ? (
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => !drag.wasDrag() && setDetail(placed.indexOf(item))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setDetail(placed.indexOf(item));
                                }
                              }}
                              aria-label={`Ver em detalhe: ${isSealed(item) ? "Cápsula PINZ" : isHidden(item) ? "Pin em segredo" : typeLabel[item.type]}`}
                              className="group block cursor-zoom-in rounded-[0.4em] focus-visible:outline-2 focus-visible:outline-offset-[0.3em] focus-visible:outline-[#f7f0dd]"
                            >
                              <div className="pointer-events-none origin-center transition-transform duration-150 group-hover:scale-[1.18]">
                                <MessageView key={item.id} message={item} />
                              </div>
                            </div>
                          ) : (
                            <MessageView key={item.id} message={item} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <BadgeLayer />

                </div>
              </div>
              {children}
            </main>
      {dense && <PinDetail items={placed} index={detail} onIndex={setDetail} onClose={() => setDetail(null)} board={look.id} />}
    </>
  );
}
