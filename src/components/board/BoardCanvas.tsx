"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { typeLabel, isHidden, isSealed, type BoardItem } from "@/lib/types";
import { boardById } from "@/lib/boards";
import { gridFor, layoutSlots } from "@/lib/slots";
import { BOARD_CAPACITY, type PlanId } from "@/lib/plans";
import { MessageView } from "../messages/MessageView";
import { EmptySlot } from "./SlotMarker";
import { PinDetail, type DetailEntry } from "./PinDetail";
import { BadgeLayer } from "../badges/BadgeLayer";
import { useBadges } from "../badges/BadgeContext";
import { PHYSICAL_TYPES } from "@/lib/badges";
import { useModeration } from "./ModerationContext";
import { usePinDrag } from "./usePinDrag";
import { paddedBox, pinBox } from "@/lib/pinBox";
import { FREE_MURAL } from "@/lib/slots";
import type { PinPlace } from "../composer/types";

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
      g.style.fontSize = `max(3px, ${base}cqw)`; // escala cheia
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
  onNotify,
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
  onCompose: ((slot?: number, place?: PinPlace) => void) | null;
  /** aviso curto (mural livre: por que o pin não cabe onde a pessoa clicou) */
  onNotify?: (msg: string) => void;
  hint?: boolean;
  /** Texto do bilhete do mural vazio (personalizado pelo dono PINZ+). */
  /** Quadro inteiro visível (celular deitado), em vez de preencher o espaço cortando as bordas. */
  contain?: boolean;
  children?: ReactNode;
}) {
  const dense = capacity > 15; // quadro denso (28): cards pequenos, clique no pin para ler
  const { cols, rows } = gridFor(capacity);
  const layout = layoutSlots(items, capacity); // cada pin no espaço escolhido por quem o colou
  // espaços vizinhos que um pin deslocado pelo dono passa a cobrir (espaço → id do pin)
  const coverBy = new Map<number, string>();
  for (const it of items) for (const sl of it.fcov ?? []) coverBy.set(sl, it.id);
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
  const { removeOver, badges } = useBadges();
  // espaços cobertos por pins da loja (relógio, clima…): ficam sem receber post-its, fotos e vídeos
  const covered = new Set(badges.flatMap((b) => (b.kind === "display" ? (b.slots ?? []) : [])));
  // fila do detalhe: pins e widgets na ordem em que aparecem no mural (o widget entra no lugar do(s) espaço(s) que cobre)
  const detailList: DetailEntry[] = (() => {
    const keyed: { k: number; e: DetailEntry }[] = placed.map((it) => ({ k: it.slot ?? 0, e: it }));
    for (const b of badges) {
      if (b.kind !== "display" || !b.data) continue;
      const k = b.slots && b.slots.length ? Math.min(...b.slots) : Math.floor((b.y / 100) * rows) * cols + Math.floor((b.x / 100) * cols);
      keyed.push({ k: k - 0.5, e: { id: b.id, widget: true, data: b.data } });
    }
    return keyed.sort((a, c) => a.k - c.k).map((x) => x.e);
  })();
  const detailIndexOf = (id: string) => detailList.findIndex((e) => e.id === id);
  // tocar num widget da loja abre o detalhe na mesma fila das setas (só o quadro que está à vista responde)
  const detailRef = useRef(detailList);
  detailRef.current = detailList;
  useEffect(() => {
    if (!dense) return;
    const h = (e: Event) => {
      if (!root.current || root.current.offsetParent === null) return;
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      const i = detailRef.current.findIndex((x) => x.id === id);
      if (i < 0) return;
      e.preventDefault();
      setDetail(i);
    };
    window.addEventListener("pinz:open-widget", h);
    return () => window.removeEventListener("pinz:open-widget", h);
  }, [dense]);
  const root = useRef<HTMLElement>(null);
  const say = (msg: string) => (onNotify ?? mod?.notify)?.(msg);
  type Box = { left: number; right: number; top: number; bottom: number };
  /**
   * Onde um pin (retângulo `full`, em px da tela) pode ficar: não vale sobre outro pin, sobre um display, sobre espaço coberto nem fora do mural.
   * O pin pertence ao espaço que ele mais cobre e cobre os vizinhos cujo miolo (70% centrais) ele toca; os espaços das margens continuam livres.
   * `id` = o pin que está sendo movido (ignorado nas conferências) e `home` = o espaço onde ele está hoje (o retângulo natural dele).
   */
  const solve = (full: Box, em: number, id?: string, home?: { slot: number; cx: number; cy: number }): { error: string } | { slot: number; ox: number; oy: number; cov: number[]; box: Box } => {
    const wrap = root.current;
    const layer = wrap?.querySelector<HTMLElement>("[data-badge-layer]");
    if (!wrap || !layer) return { error: "Não foi possível posicionar agora." };
    const w = full.right - full.left;
    const h = full.bottom - full.top;
    const lr = layer.getBoundingClientRect();
    // limites do mural: a cortiça inteira, com uma margem mínima para dentro (o pin chega até a borda, sem passar para a moldura de madeira)
    const padX = -lr.width * 0.012;
    const padY = -lr.height * 0.012;
    const bounds = { left: lr.left - padX, right: lr.right + padX, top: lr.top - padY, bottom: lr.bottom + padY };
    if (w > bounds.right - bounds.left || h > bounds.bottom - bounds.top) return { error: "O pin é grande demais para ficar aqui." };
    const vis = (e: Element) => e.getBoundingClientRect().width > 0 && (e as HTMLElement).offsetParent !== null;
    // quem atrapalha: os outros pins e os displays (o retângulo real de cada um)
    const obstacles: { box: Box | DOMRect; what: string }[] = [];
    for (const other of wrap.querySelectorAll<HTMLElement>("[data-pin-id]")) {
      if (other.dataset.pinId !== id && vis(other)) obstacles.push({ box: pinBox(other), what: "outro pin" }); // cartão + tachinha + folga
    }
    for (const d of layer.querySelectorAll<HTMLElement>("[data-badge-kind='display']")) {
      if (vis(d)) obstacles.push({ box: d.getBoundingClientRect(), what: "um display" });
    }
    // o pin se ajusta sozinho: se passou da borda ou invadiu um vizinho, desliza o mínimo para o lado (até uma distância razoável)
    const t = 0.02; // quase nenhuma tolerância: a folga de verdade já vem do retângulo dos pins (tachinha e margem)
    // o pin que está sendo posto também leva a tachinha (sai por cima do cartão) e uma folguinha
    const shrink = (r: Box): Box => {
      const p = paddedBox(r, em);
      return { left: p.left + w * t, right: p.right - w * t, top: p.top + h * t, bottom: p.bottom - h * t };
    };
    const inside = (r: Box) => {
      let dx = 0;
      let dy = 0;
      if (r.left < bounds.left) dx = bounds.left - r.left;
      else if (r.right > bounds.right) dx = bounds.right - r.right;
      if (r.top < bounds.top) dy = bounds.top - r.top;
      else if (r.bottom > bounds.bottom) dy = bounds.bottom - r.bottom;
      return { left: r.left + dx, right: r.right + dx, top: r.top + dy, bottom: r.bottom + dy };
    };
    // soltou longe demais do mural: não adianta ajustar
    const cx0 = (full.left + full.right) / 2;
    const cy0 = (full.top + full.bottom) / 2;
    if (cx0 < bounds.left - w * 0.6 || cx0 > bounds.right + w * 0.6 || cy0 < bounds.top - h * 0.6 || cy0 > bounds.bottom + h * 0.6) return { error: "O pin precisa ficar dentro do mural." };
    full = inside(full);
    const startBox = full; // daqui em diante só conta o quanto o pin precisou escorregar para não invadir os vizinhos
    let blocked = "";
    for (let n = 0; n < 10; n++) {
      const R = shrink(full);
      const o = obstacles.find((x) => R.left < x.box.right && R.right > x.box.left && R.top < x.box.bottom && R.bottom > x.box.top);
      if (!o) {
        blocked = "";
        break;
      }
      blocked = o.what;
      // empurra pelo lado em que a invasão é menor
      const moves = [
        { dx: o.box.left - R.right - 1, dy: 0 },
        { dx: o.box.right - R.left + 1, dy: 0 },
        { dx: 0, dy: o.box.top - R.bottom - 1 },
        { dx: 0, dy: o.box.bottom - R.top + 1 },
      ].sort((p, q) => Math.abs(p.dx) + Math.abs(p.dy) - (Math.abs(q.dx) + Math.abs(q.dy)));
      const m = moves[0];
      full = inside({ left: full.left + m.dx, right: full.right + m.dx, top: full.top + m.dy, bottom: full.bottom + m.dy });
    }
    if (blocked) return { error: `Não dá para soltar aqui: o pin ficaria sobre ${blocked}.` };
    if (Math.hypot((full.left + full.right) / 2 - (startBox.left + startBox.right) / 2, (full.top + full.bottom) / 2 - (startBox.top + startBox.bottom) / 2) > Math.max(w, h) * 0.6) return { error: "Não cabe aqui: tente um lugar mais livre." };
    type Touch = { slot: number; area: number; cx: number; cy: number };
    const touched: Touch[] = [];
    const area = (r: Box, box: Box) => {
      const ix = Math.min(r.right, box.right) - Math.max(r.left, box.left);
      const iy = Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top);
      return ix > 0 && iy > 0 ? ix * iy : 0;
    };
    const core = (r: Box): Box => {
      const pw = (r.right - r.left) * 0.15;
      const ph = (r.bottom - r.top) * 0.15;
      return { left: r.left + pw, right: r.right - pw, top: r.top + ph, bottom: r.bottom - ph };
    };
    const size = (r: Box) => (r.right - r.left) * (r.bottom - r.top);
    if (home) {
      const hc = core({ left: home.cx - 7 * em, right: home.cx + 7 * em, top: home.cy - 6.5 * em, bottom: home.cy + 6.5 * em }); // o espaço vazio tem 14em × 13em
      const a = area(full, hc);
      if (a / size(hc) >= 0.03) touched.push({ slot: home.slot, area: a, cx: home.cx, cy: home.cy });
    }
    for (const cell of wrap.querySelectorAll<HTMLElement>("[data-slot]")) {
      if ((id && cell.dataset.pinId === id) || !vis(cell)) continue;
      const r = cell.getBoundingClientRect();
      const rc = core(r);
      const a = area(full, rc);
      if (a / size(rc) < 0.03) continue;
      if (cell.hasAttribute("data-pin-id")) return { error: "Não dá para soltar aqui: o pin ficaria sobre outro pin." };
      if (cell.hasAttribute("data-covered") && cell.dataset.coverBy !== id) return { error: cell.hasAttribute("data-cover-by") ? "Não dá para soltar aqui: o pin ficaria sobre outro pin." : "Não dá para soltar aqui: esse lugar está coberto por um display." };
      touched.push({ slot: Number(cell.dataset.slot), area: a, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2 });
    }
    if (!touched.length) return { error: "O pin precisa ficar sobre o mural." };
    const anchor = touched.reduce((a, b) => (b.area > a.area ? b : a));
    const ox = Math.round((((full.left + full.right) / 2 - anchor.cx) / em) * 100) / 100;
    const oy = Math.round((((full.top + full.bottom) / 2 - anchor.cy) / em) * 100) / 100;
    if (Math.abs(ox) > 400 || Math.abs(oy) > 400) return { error: "O pin precisa ficar dentro do mural." };
    return { slot: anchor.slot, ox, oy, cov: touched.filter((x) => x.slot !== anchor.slot).map((x) => x.slot).slice(0, 8), box: full };
  };

  // durante o arraste: aqui o pin pode ser solto? (o contorno do pin fica verde ou vermelho)
  const nudgeOk = (id: string, mv: { dx: number; dy: number; k: number; rect: Box }): string | null => {
    const wrap = root.current;
    const item = items.find((i) => i.id === id);
    const el = wrap?.querySelector<HTMLElement>(`[data-pin-id="${id}"]`);
    if (!wrap || !item || !el || typeof item.slot !== "number") return null;
    const em = (parseFloat(getComputedStyle(el).fontSize) || 10) * mv.k;
    const full = { left: mv.rect.left + mv.dx, right: mv.rect.right + mv.dx, top: mv.rect.top + mv.dy, bottom: mv.rect.bottom + mv.dy };
    const sol = solve(full, em, id, { slot: item.slot, cx: (mv.rect.left + mv.rect.right) / 2 - (item.ox ?? 0) * em, cy: (mv.rect.top + mv.rect.bottom) / 2 - (item.oy ?? 0) * em });
    return "error" in sol ? sol.error : null;
  };

  // o dono leva o pin para onde quiser: ele passa a pertencer ao espaço onde fica (o espaço de onde saiu volta a aparecer)
  const nudge = (id: string, mv: { dx: number; dy: number; k: number; rect: Box }) => {
    const wrap = root.current;
    const m = mod;
    const item = items.find((i) => i.id === id);
    const el = wrap?.querySelector<HTMLElement>(`[data-pin-id="${id}"]`);
    if (!wrap || !m || !item || !el || typeof item.slot !== "number") return;
    if (Math.hypot(mv.dx, mv.dy) < 4) return; // foi só um clique
    const em = (parseFloat(getComputedStyle(el).fontSize) || 10) * mv.k; // tamanho de 1em na tela (com o zoom)
    const full = { left: mv.rect.left + mv.dx, right: mv.rect.right + mv.dx, top: mv.rect.top + mv.dy, bottom: mv.rect.bottom + mv.dy };
    const sol = solve(full, em, id, { slot: item.slot, cx: (mv.rect.left + mv.rect.right) / 2 - (item.ox ?? 0) * em, cy: (mv.rect.top + mv.rect.bottom) / 2 - (item.oy ?? 0) * em });
    if ("error" in sol) return m.notify(sol.error);
    // nenhum pin fica com botton por cima: os que estiverem na área de destino voltam para a barra
    removeOver(sol.box);
    void m.nudge(id, sol.slot, sol.ox, sol.oy, sol.cov);
  };

  // ajuste automático (só o dono): um pin colado em mural livre tem o tamanho conhecido só depois de aparecer; se passou da borda ou encostou num vizinho,
  // ele é reencaixado sozinho (mesma regra de quando se arrasta). Só mexe em pins que já têm deslocamento ou que um display passou a cobrir.
  const fitted = useRef(new Map<string, string>());
  useEffect(() => {
    if (!FREE_MURAL || !mod) return;
    const run = () => {
      const wrap = root.current;
      if (!wrap) return;
      for (const el of wrap.querySelectorAll<HTMLElement>("[data-pin-id]")) {
        const id = el.dataset.pinId;
        const item = items.find((x) => x.id === id);
        if (!id || !item || typeof item.slot !== "number") continue;
        if (el.getBoundingClientRect().width <= 0 || el.offsetParent === null) continue;
        if (!item.ox && !item.oy) {
          // pin que nunca foi movido: só entra no ajuste se um display passou a cobri-lo (por exemplo, o display foi ampliado)
          const pb = pinBox(el);
          const lay = wrap.querySelector<HTMLElement>("[data-badge-layer]");
          const under = [...(lay?.querySelectorAll<HTMLElement>("[data-badge-kind='display']") ?? [])].some((d) => {
            const b = d.getBoundingClientRect();
            return b.width > 0 && pb.left < b.right && pb.right > b.left && pb.top < b.bottom && pb.bottom > b.top;
          });
          if (!under) continue;
        }
        const r = el.getBoundingClientRect();
        const sig = `${id}:${item.slot}:${item.ox}:${item.oy}:${Math.round(r.width)}:${Math.round(r.height)}`; // inclui a altura: foto que carrega depois cresce
        if (fitted.current.get(id) === sig) continue;
        fitted.current.set(id, sig);
        const k = el.offsetWidth ? r.width / el.offsetWidth : 1;
        const em = (parseFloat(getComputedStyle(el).fontSize) || 10) * k;
        const full = { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        const sol = solve(full, em, id, { slot: item.slot, cx: (r.left + r.right) / 2 - (item.ox ?? 0) * em, cy: (r.top + r.bottom) / 2 - (item.oy ?? 0) * em });
        if ("error" in sol) continue;
        const moved = Math.hypot((sol.box.left + sol.box.right) / 2 - (r.left + r.right) / 2, (sol.box.top + sol.box.bottom) / 2 - (r.top + r.bottom) / 2);
        const same = sol.slot === item.slot && sol.cov.join() === (item.fcov ?? []).join();
        if (moved < 2 && same) continue;
        void mod.nudge(id, sol.slot, sol.ox, sol.oy, sol.cov);
        break; // um por vez; o próximo é conferido depois que este assentar
      }
    };
    // confere logo e de novo de tempos em tempos: fotos e displays mudam de tamanho depois de carregar
    const timer = window.setTimeout(run, 600);
    const every = window.setInterval(run, 2000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(every);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, mod]);

  // mural livre: no desktop, clique duplo num ponto vazio da cortiça; no celular, segurar o dedo ali. Abre o compositor já com a posição escolhida
  // (sem passar pela grade de espaços livres)
  const ptype = useRef("mouse");
  const hold = useRef<{ x: number; y: number; timer: number } | null>(null);
  const cancelHold = () => {
    if (hold.current) window.clearTimeout(hold.current.timer);
    hold.current = null;
  };
  const tryPlace = (target: HTMLElement, x: number, y: number) => {
    if (!FREE_MURAL || !onCompose || !unlocked || !hasSelection) return;
    if (target.closest("[data-pin-id],[data-badge-id],[data-badge-controls],[data-badge-bar],button,a,dialog,[role='button']") || drag.wasDrag()) return;
    const grid = fit.ref.current;
    if (!grid) return;
    const gr = grid.getBoundingClientRect();
    const em = (parseFloat(getComputedStyle(grid).fontSize) || 10) * (grid.offsetWidth ? gr.width / grid.offsetWidth : 1);
    // um pin pequeno, centrado no ponto escolhido: assim dá para chegar bem perto das bordas; o tamanho real só se conhece depois de colado,
    // e o dono do mural reencaixa o pin sozinho (veja o ajuste automático abaixo)
    const hw = 4 * em;
    const hh = 4 * em;
    const sol = solve({ left: x - hw, right: x + hw, top: y - hh, bottom: y + hh }, em);
    if ("error" in sol) return say(sol.error);
    onCompose(sol.slot, { ox: sol.ox, oy: sol.oy, cov: sol.cov });
  };
  const boardPointerDown = (e: React.PointerEvent) => {
    ptype.current = e.pointerType;
    cancelHold();
    if (e.pointerType === "mouse" || !e.isPrimary) return;
    const target = e.target as HTMLElement;
    const x = e.clientX;
    const y = e.clientY;
    hold.current = {
      x,
      y,
      timer: window.setTimeout(() => {
        hold.current = null;
        tryPlace(target, x, y);
      }, 500),
    };
  };
  const boardPointerMove = (e: React.PointerEvent) => {
    if (hold.current && Math.hypot(e.clientX - hold.current.x, e.clientY - hold.current.y) > 10) cancelHold(); // mexeu o dedo: é o gesto de mover o quadro
  };
  const boardDoubleClick = (e: React.MouseEvent) => {
    if (ptype.current !== "mouse") return;
    tryPlace(e.target as HTMLElement, e.clientX, e.clientY);
  };

  const drag = usePinDrag(
    mod
      ? (id, to) => {
          // pin de aparelho (vídeo, áudio, voz, local, cápsula) não pode ficar com botton por cima: os que estiverem na área de destino voltam para a barra
          const from = layout.findIndex((x) => x?.id === id);
          const slotEl = (n: number) => root.current?.querySelector<HTMLElement>(`[data-slot="${n}"]`) ?? null;
          const isPhysical = (it: BoardItem | null | undefined) => !!it; // todo pin: os bottons debaixo dele voltam para a barra
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
    mod ? nudge : undefined,
    mod ? nudgeOk : undefined,
  );
  const look = boardById(board);
  const CORK = look.cork; // área útil deste quadro (em % da imagem 3:2)
  const baseEm = BASE_EM_CQW * look.size * (dense ? 0.64 : 1); // denso: cards menores que a célula, para sobrar espaço entre os pins (no tablet ficavam colados)
  const fit = useFitScale(baseEm, dense ? 0.2 : 0.55, [items, baseEm, capacity]);
  const gridFont = `max(3px, ${(baseEm * fit.scale).toFixed(4)}cqw)`;

  // um pin do quadro (na grade ou solto): o mesmo cartão, com as mesmas regras de arrastar e abrir o detalhe
  const pinNode = (item: BoardItem, i: number) => {
    const tilt = TILT[i % TILT.length];
    const { dx, dy } = jitter(i);
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
                                // deslocamento dado pelo dono: usa a propriedade "translate", que não tem transição (o pin aparece direto onde foi solto)
                                "--ox": `${item.ox ?? 0}em`,
                                "--oy": `${item.oy ?? 0}em`,
                                animationDelay: `${0.05 + i * 0.06}s`,
                              } as CSSProperties
                            }
                          >
                            {dense && !isHidden(item) ? (
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => !drag.wasDrag() && setDetail(detailIndexOf(item.id))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setDetail(detailIndexOf(item.id));
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
  };

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
                  onDoubleClick={boardDoubleClick}
                  onPointerDown={boardPointerDown}
                  onPointerMove={boardPointerMove}
                  onPointerUp={cancelHold}
                  onPointerCancel={cancelHold}
                  style={{ left: `${CORK.left}%`, top: `${CORK.top + 2}%`, width: `${CORK.width}%`, height: `${CORK.height - 2.5}%`, fontSize: `max(5px, ${baseEm}cqw)` }}
                >
                  <div
                    ref={fit.ref}
                    className="grid h-full content-evenly items-center justify-items-center"
                    style={{ fontSize: gridFont, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, auto)`, rowGap: dense ? (capacity > 28 ? "3.6em" : "1.4em") : "1.5em", columnGap: dense ? "1em" : "0.4em" }}
                  >
                    {Array.from({ length: capacity }, (_, i) => {
                      const item = layout[i];
                      const tilt = TILT[i % TILT.length];
                      const { dx, dy } = jitter(i);

                      // espaço sem mensagem: todos aparecem livres, em qualquer plano (o limite do plano é de QUANTOS pins, não de quais espaços).
                      // No mural de exemplo (nenhum mural escolhido) não mostramos marcadores: só os cartões de amostra.
                      if (!item) {
                        if (!hasSelection) return <div key={`e${i}`} aria-hidden />;
                        if (FREE_MURAL || covered.has(i) || coverBy.has(i)) {
                          // coberto por um pin da loja: o espaço continua ocupando o lugar na grade, mas não aparece nem recebe pin
                          return (
                            <div key={`e${i}`} data-slot={i} {...(covered.has(i) || coverBy.has(i) ? { "data-covered": "" } : {})} {...(coverBy.has(i) && !covered.has(i) ? { "data-cover-by": coverBy.get(i) } : {})} aria-hidden className="invisible">
                              <EmptySlot />
                            </div>
                          );
                        }
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

                      return pinNode(item, i);
                    })}
                  </div>

                  <BadgeLayer />

                </div>
              </div>
              {children}
            </main>
      {dense && <PinDetail items={detailList} index={detail} onIndex={setDetail} onClose={() => setDetail(null)} board={look.id} />}
    </>
  );
}
