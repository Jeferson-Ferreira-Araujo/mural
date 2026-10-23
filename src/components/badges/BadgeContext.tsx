"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { spotLight } from "@/lib/spot";
import { pinBox } from "@/lib/pinBox";
import { createPortal } from "react-dom";
import { addBadge, addDisplay, BADGE_OK_TYPES, badgeDef, badgeSrc, baseEmOf, baseEmOfBadge, DEFAULT_SCALE, DISPLAY_SCALE, isDisplayKey, MAX_BADGES, MAX_SCALE, MAX_TILT, MIN_SCALE, moveBadge, PHYSICAL_TYPES, ratioOfBadge, ratioOfKey, removeBadge, setBadgeRotation, setDisplayHidden, setBadgeScale, updateDisplayData, updateDisplayLayout, type DisplayPayload, type PlacedBadge, type Stock } from "@/lib/badges";
import { getBrowserSupabase } from "@/lib/supabase";
import { BOARD_EM, NATURAL_W, RATIO, baseStyle, shapeOfStyle } from "@/lib/displayShape";
import { DisplayCard, isBundled, splitDisplayId } from "../widgets";
import { HabitCtx } from "../widgets/habitCtx";
import { DisplayDetail } from "./DisplayDetail";
import { DisplayDialog } from "./DisplayDialog";
import { TouchSlider } from "./TouchSlider";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

export type DragSrc = { kind: "new"; key: number } | { kind: "placed"; id: string; key: number; /** tamanho em % do botton que está sendo arrastado */ scale?: number };

type Ctx = {
  badges: PlacedBadge[];
  /** só o dono, no próprio mural */
  editable: boolean;
  /** botom que está sendo arrastado (some do lugar de origem até soltar) */
  draggingId: string | null;
  /** arrastando um botton NOVO da barra para o mural */
  draggingNew: boolean;
  /** unidades que a pessoa ainda pode colocar de cada pin (1 por pin + extras compradas; ninguém tem ilimitado) */
  stock: (key: number) => Stock;
  /** quando o botton foi comprado (segundos), para ordenar a barra; undefined = já era da conta */
  acquiredAt: (key: number) => number | undefined;
  openStore: () => void;
  begin: (e: PointerEvent, src: DragSrc, sourceEl: HTMLElement, anyDirection?: boolean) => void;
  /** mouse sobre um botton (null = saiu): mostra os controles +, − e lixeira ao lado dele */
  hover: (id: string | null) => void;
  /** toque no botton (celular): mostra os controles até tocar em outro lugar */
  select: (id: string | null) => void;
  /** tira do mural (e devolve à barra) os botons que estão debaixo desta área da tela: usado quando um pin de aparelho é movido para cima deles */
  removeOver: (rect: { left: number; right: number; top: number; bottom: number }, minOverlap?: number) => void;
  /** pins da loja que a pessoa tem (bible, motivation, clock, weather): aparecem na barra */
  displays: string[];
  /** escolheu um pin da loja na barra: abre as opções e depois o mural escurece para ela arrastar o pin ao lugar que quiser */
  pickDisplay: (product: string) => void;
  /** editar contorno, horário ou cidade de um display já colocado */
  editDisplay: (id: string) => void;
  /** posicionando um display (o mural fica escuro) */
  placing: boolean;
  /** abre o detalhe (widget grande) de um pin da loja já colocado */
  openDetail: (id: string) => void;
  /** o dono pode colocar displays neste mural (aba Displays do compositor) */
  canDisplays: boolean;
  /** coloca o display (id "tipo:estilo") no centro de um espaço livre do mural */
  placeDisplayAtSlot: (id: string, slot: number) => void;
  /** coloca um display já configurado (estilo, textos, datas) no centro de um espaço livre */
  placeDisplayDataAtSlot: (data: DisplayPayload, slot: number) => void;
  /** tira o display do mural (detalhe) */
  removeDisplay: (id: string) => void;
  /** liga/desliga o segredo do display (PINZ+); devolve se deu certo */
  setDisplaySecret: (id: string, hidden: boolean) => Promise<boolean>;
};

const unlimited = (): Stock => ({ owned: true, left: 1, total: 1 }); // padrão sem loja carregada
const BadgeCtx = createContext<Ctx>({ badges: [], editable: false, draggingId: null, draggingNew: false, stock: unlimited, acquiredAt: () => undefined, openStore: () => undefined, begin: () => undefined, hover: () => undefined, select: () => undefined, removeOver: () => undefined, displays: [], pickDisplay: () => undefined, editDisplay: () => undefined, placing: false, openDetail: () => undefined, canDisplays: false, placeDisplayAtSlot: () => undefined, placeDisplayDataAtSlot: () => undefined, removeDisplay: () => undefined, setDisplaySecret: async () => false });
export const useBadges = () => useContext(BadgeCtx);

type Drop = { kind: "ok"; x: number; y: number; /** displays: espaços do quadro cobertos */ slots?: number[]; /** displays: a área que ocupam na tela (os bottons ali voltam para a barra) */ rect?: { left: number; right: number; top: number; bottom: number } } | { kind: "physical" } | { kind: "tack" } | { kind: "badge" } | { kind: "out" } | { kind: "bar" } | { kind: "occupied" };
type Ghost = { key: number; x: number; y: number; w: number; h: number; state: "ok" | "bad"; /** inclinação do botton já colocado: o arraste mostra o botton como ele é */ rot?: number; back?: { x: number; y: number } };

/** Espaços do quadro que um retângulo (em px) cobre: qualquer pedaço visível já conta. `taken` = os que já têm pin. */
const COVER_MIN = 0.03; // fração da área do espaço
function slotsUnder(rect: { left: number; right: number; top: number; bottom: number }): { slots: number[]; taken: number[] } {
  const slots: number[] = [];
  const taken: number[] = [];
  for (const el of document.querySelectorAll<HTMLElement>("[data-slot]")) {
    if (!(el.getBoundingClientRect().width > 0 && el.offsetParent !== null)) continue;
    const r = el.getBoundingClientRect();
    const ix = Math.min(r.right, rect.right) - Math.max(r.left, rect.left);
    const iy = Math.min(r.bottom, rect.bottom) - Math.max(r.top, rect.top);
    if (ix > 0 && iy > 0 && (ix * iy) / (r.width * r.height) >= COVER_MIN) {
      const n = Number(el.dataset.slot);
      slots.push(n);
      if (el.hasAttribute("data-pin-id") || el.hasAttribute("data-cover-by")) taken.push(n);
    }
  }
  return { slots, taken };
}

const visible = (el: Element | null) => !!el && el.getBoundingClientRect().width > 0 && (el as HTMLElement).offsetParent !== null;
const visibleOne = (sel: string) => [...document.querySelectorAll(sel)].find(visible) ?? null;
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), Math.max(a, b));

/** Onde o botom cai se for solto em (px, py)? Respeita o quadro, os pinz físicos e as tachinhas. */
function evaluate(px: number, py: number, w: number, h: number, layer: Element, ignore?: Element, display = false, skipBar = false): Drop {
  const bar = skipBar ? null : visibleOne("[data-badge-bar]");
  if (bar) {
    const b = bar.getBoundingClientRect();
    if (px >= b.left && px <= b.right && py >= b.top && py <= b.bottom) return { kind: "bar" };
  }
  const lr = layer.getBoundingClientRect();
  const m = 6;
  if (px < lr.left - m || px > lr.right + m || py < lr.top - m || py > lr.bottom + m) return { kind: "out" };

  // outros bottons já colocados (o que está sendo arrastado não conta): não pode ficar um sobre o outro. Pins e displays não contam: o botton pode ficar por cima deles
  const others = [...layer.children].filter((c) => c !== ignore && (c as HTMLElement).dataset.badgeKind !== "display").map((c) => c.getBoundingClientRect());
  const coversBadge = (x: number, y: number) => {
    const hw = (w * 0.8) / 2;
    const hh = (h * 0.8) / 2;
    return others.some((o) => {
      const ow = (o.width * 0.8) / 2;
      const oh = (o.height * 0.8) / 2;
      const ox = o.left + o.width / 2;
      const oy = o.top + o.height / 2;
      return x + hw > ox - ow && x - hw < ox + ow && y + hh > oy - oh && y - hh < oy + oh;
    });
  };
  // display da loja: vale em qualquer lugar, menos sobre outro botton/display e sobre espaços que já têm pin; os espaços vazios que ele cobre ficam sem receber pins
  if (display) {
    const dx = clamp(px, lr.left + w / 2, lr.right - w / 2);
    const dy = clamp(py, lr.top + h / 2, lr.bottom - h / 2);
    // outro widget da loja no caminho não vale; botton comum não impede: ele volta para a barra (como acontece com pins de aparelho)
    const dOthers = [...layer.children].filter((c) => c !== ignore && (c as HTMLElement).dataset.badgeKind === "display").map((c) => c.getBoundingClientRect());
    // um display nunca fica sobre outro: vale o retângulo inteiro de cada um (só uma tolerância mínima de 1%)
    const tx = w * 0.01;
    const ty = h * 0.01;
    if (dOthers.some((o) => dx + w / 2 - tx > o.left && dx - w / 2 + tx < o.right && dy + h / 2 - ty > o.top && dy - h / 2 + ty < o.bottom)) return { kind: "badge" };
    const rect = { left: dx - w / 2, right: dx + w / 2, top: dy - h / 2, bottom: dy + h / 2 };
    const { slots, taken } = slotsUnder(rect);
    if (taken.length) return { kind: "occupied" };
    // pin deslocado pelo dono no caminho: também ocupa (vale o retângulo real do pin, com uma folga pequena)
    for (const fp of document.querySelectorAll<HTMLElement>("[data-pin-id]")) {
      if (fp.getBoundingClientRect().width <= 0 || fp.offsetParent === null) continue;
      const b = pinBox(fp); // cartão + tachinha + folga
      if (rect.left < b.right && rect.right > b.left && rect.top < b.bottom && rect.bottom > b.top) return { kind: "occupied" };
    }
    return { kind: "ok", x: ((dx - lr.left) / lr.width) * 100, y: ((dy - lr.top) / lr.height) * 100, slots, rect };
  }
  const cx = clamp(px, lr.left + w / 2, lr.right - w / 2);
  const cy = clamp(py, lr.top + h / 2, lr.bottom - h / 2);

  if (coversBadge(cx, cy)) return { kind: "badge" };
  // botton só fica sobre foto, post-it, papel (texto e lista) e desenho: nunca sobre mapa, vídeo, música, voz, cápsula nem display
  const br = { left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2 };
  const share = (o: { left: number; right: number; top: number; bottom: number }) => {
    const iw = Math.min(br.right, o.right) - Math.max(br.left, o.left);
    const ih = Math.min(br.bottom, o.bottom) - Math.max(br.top, o.top);
    return iw > 0 && ih > 0 ? (iw * ih) / (w * h) : 0; // quanto do botton cobre o outro item
  };
  for (const ch of layer.children) {
    if (ch !== ignore && (ch as HTMLElement).dataset.badgeKind === "display" && share(ch.getBoundingClientRect()) > 0.15) return { kind: "physical" };
  }
  for (const fp of document.querySelectorAll<HTMLElement>("[data-pin-id]")) {
    if (fp.getBoundingClientRect().width <= 0 || fp.offsetParent === null) continue;
    if (BADGE_OK_TYPES.has(fp.dataset.pinType ?? "")) continue;
    if (share(fp.getBoundingClientRect()) > 0.15) return { kind: "physical" };
  }
  // botton nunca fica sobre a tachinha (o alfinete) de um pin: vale o miolo da imagem, que tem margem transparente
  for (const tk of document.querySelectorAll<HTMLElement>("[data-tack]")) {
    const t = tk.getBoundingClientRect();
    if (t.width <= 0 || tk.offsetParent === null) continue;
    if (t.right < lr.left || t.left > lr.right || t.bottom < lr.top || t.top > lr.bottom) continue; // tachinha de fora do mural (ex.: amostra de uma janela)
    const tx0 = t.left + t.width / 2;
    const ty0 = t.top + t.height / 2;
    if (br.left < tx0 + t.width * 0.3 && br.right > tx0 - t.width * 0.3 && br.top < ty0 + t.height * 0.3 && br.bottom > ty0 - t.height * 0.3) return { kind: "tack" };
  }
  return { kind: "ok", x: ((cx - lr.left) / lr.width) * 100, y: ((cy - lr.top) / lr.height) * 100 };
}

/**
 * Botons do mural: lista, e (para o dono) o arrastar e soltar. Quem usa envolve a tela do mural com este provedor.
 * Regras ao soltar: só dentro do quadro; sobre uma tachinha vai para o lado dela; sobre pinz "físicos" (música, vídeo, voz, lugar, cápsula)
 * não vale e o botom volta; solto sobre a barra de baixo, o botom que já estava no mural sai dele.
 */
export function BadgeProvider({
  muralId,
  editable,
  badges,
  setBadges,
  notify,
  stock = unlimited,
  acquiredAt = () => undefined,
  onSynced,
  onOpenStore = () => undefined,
  displays = [],
  canDisplays = false,
  onDisplaysChanged,
  children,
}: {
  muralId?: string;
  editable: boolean;
  badges: PlacedBadge[];
  setBadges: (fn: (prev: PlacedBadge[]) => PlacedBadge[]) => void;
  notify: (msg: string) => void;
  stock?: (key: number) => Stock;
  acquiredAt?: (key: number) => number | undefined;
  /** chamado depois que o servidor confirmou (ou recusou) colocar/tirar um botton: hora de reler o estoque */
  onSynced?: () => void;
  onOpenStore?: () => void;
  /** pins da loja que a pessoa tem */
  displays?: string[];
  /** o dono pode colocar displays neste mural (mural pessoal dele) */
  canDisplays?: boolean;
  /** um display foi colocado, mudou de lugar ou foi editado: hora de reler o mural */
  onDisplaysChanged?: () => void;
  children: ReactNode;
}) {
  const tx = useTranslations("components.badges.BadgeContext");
  const tl = useLit();
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingNew, setDraggingNew] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const hoverTimer = useRef<number | null>(null);
  // pins da loja: diálogo de opções (novo ou edição) e o modo em que o mural escurece para a pessoa arrastar o pin ao lugar que quiser
  const [dialog, setDialog] = useState<{ mode: "new" | "edit"; product: string; style: string; id?: string; initial?: DisplayPayload; /** espaço livre clicado: o display entra no centro dele */ slot?: number } | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const displaysRef = useRef(displays);
  displaysRef.current = displays;
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [placing, setPlacing] = useState<{ product: string; data: DisplayPayload } | null>(null);
  const [detail, setDetail] = useState<DisplayPayload | null>(null); // detalhe (widget grande) aberto
  const live = useRef({ muralId, editable, badges, notify, stock, onSynced, onDisplaysChanged });
  live.current = { muralId, editable, badges, notify, stock, onSynced, onDisplaysChanged };
  const cleanup = useRef<(() => void) | null>(null);
  const removeOverRef = useRef<((rect: { left: number; right: number; top: number; bottom: number }, minOverlap?: number) => void) | null>(null);

  const begin = useCallback(
    (e: PointerEvent, src: DragSrc, sourceEl: HTMLElement, anyDirection = false) => {
      if (!live.current.editable || e.button > 0) return;
      if (src.kind === "new") {
        const st = live.current.stock(src.key);
        if (!st.owned || st.left === 0) {
          // esgotado: só não arrasta, sem aviso; botton da loja ainda não comprado: avisa
          if (!st.owned) live.current.notify(tx("m_esteBottonEDaLoja"));
          return;
        }
      }
      cleanup.current?.();
      const start = { x: e.clientX, y: e.clientY };
      const touch = e.pointerType !== "mouse";
      const displayDrag = isDisplayKey(src.key);
      let active = false;
      let size = { w: 56, h: 56 };
      let layer: Element | null = null;
      let origin: { x: number; y: number } | null = null; // para onde voltar se não puder soltar

      const rotOf = () => (src.kind === "placed" ? (live.current.badges.find((b) => b.id === src.id)?.rotation ?? 0) : undefined);
      const sourceCenter = () => {
        const r = sourceEl.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      };
      // tamanho do objeto na tela, na escala ATUAL do quadro (o zoom pode mudar durante o arraste: o objeto segurado acompanha)
      let lastScale = 0;
      let lastPt = { x: 0, y: 0 };
      let raf = 0;
      const refreshSize = () => {
        if (!layer) return;
        const lr = layer.getBoundingClientRect();
        const em = parseFloat(getComputedStyle(layer).fontSize) || 10;
        const scale = lr.width / ((layer as HTMLElement).offsetWidth || lr.width);
        lastScale = scale;
        const srcData = src.kind === "placed" ? live.current.badges.find((x) => x.id === src.id)?.data : undefined;
        const w = baseEmOfBadge(src.key, srcData) * em * scale * ((src.kind === "placed" ? (src.scale ?? (displayDrag ? DISPLAY_SCALE : DEFAULT_SCALE)) : displayDrag ? DISPLAY_SCALE : DEFAULT_SCALE) / 100);
        size = { w, h: w / ratioOfBadge(src.key, srcData) };
      };
      const tick = () => {
        if (!active) return;
        if (layer) {
          const lr = layer.getBoundingClientRect();
          const scale = lr.width / ((layer as HTMLElement).offsetWidth || lr.width);
          if (Math.abs(scale - lastScale) > 0.001) {
            refreshSize();
            setGhost({ key: src.key, x: lastPt.x, y: lastPt.y, w: size.w, h: size.h, state: stateAt(lastPt.x, lastPt.y), rot: rotOf() });
          }
        }
        raf = requestAnimationFrame(tick);
      };
      const activate = () => {
        active = true;
        layer = visibleOne("[data-badge-layer]");
        refreshSize();
        raf = requestAnimationFrame(tick);
        origin = sourceCenter();
        if (src.kind === "placed") setDraggingId(src.id);
        else setDraggingNew(true);
        document.body.classList.add("badge-dragging");
      };
      const stateAt = (x: number, y: number): "ok" | "bad" => {
        if (!layer) return "bad";
        const d = evaluate(x, y, size.w, size.h, layer, sourceEl, displayDrag);
        return d.kind === "ok" || d.kind === "bar" ? "ok" : "bad";
      };
      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        const dx = ev.clientX - start.x;
        const dy = ev.clientY - start.y;
        if (!active) {
          if (src.kind === "new" && touch && !anyDirection) {
            // na barra, no toque: gesto horizontal rola a barra; para cima/baixo arrasta o botom
            if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) return finish(null, true);
            if (Math.abs(dy) < 8) return;
          } else if (Math.hypot(dx, dy) < 4) return;
          activate();
        }
        ev.preventDefault();
        lastPt = { x: ev.clientX, y: ev.clientY };
        refreshSize();
        setGhost({ key: src.key, x: ev.clientX, y: ev.clientY, w: size.w, h: size.h, state: stateAt(ev.clientX, ev.clientY), rot: rotOf() });
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        finish(ev, false);
      };
      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        finish(null, true);
      };
      const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && finish(null, true);

      const sendBack = (at: { x: number; y: number }) => {
        // o botom desliza de volta para onde saiu (a barra, ou o lugar antigo no mural)
        const to = origin ?? sourceCenter();
        setGhost({ key: src.key, x: at.x, y: at.y, w: size.w, h: size.h, state: "bad", back: to, rot: rotOf() });
        window.setTimeout(() => setGhost(null), 280);
      };

      function finish(ev: PointerEvent | null, aborted: boolean) {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("keydown", onKey);
        cleanup.current = null;
        cancelAnimationFrame(raf);
        document.body.classList.remove("badge-dragging");
        setDraggingId(null);
        setDraggingNew(false);
        if (!active) return;
        const { notify, muralId: mid, badges: cur } = live.current;
        const at = ev ? { x: ev.clientX, y: ev.clientY } : (origin ?? { x: 0, y: 0 });
        if (aborted || !layer) return sendBack(at);
        const drop = evaluate(at.x, at.y, size.w, size.h, layer, sourceEl, displayDrag);

        if (drop.kind === "bar") {
          if (src.kind === "placed") {
            setGhost(null);
            const prev = cur;
            setBadges((l) => l.filter((b) => b.id !== src.id));
            void removeBadge(getBrowserSupabase(), src.id).then((ok) => {
              if (!ok) {
                setBadges(() => prev);
                notify(tx("m_naoFoiPossivelTirarO"));
              }
              live.current.onSynced?.(); // só agora o servidor já contou a devolução: atualiza o número da barra
            });
          } else sendBack(at);
          return;
        }
        if (drop.kind === "tack") {
          notify(tl("Um botton não pode ficar sobre o alfinete de um pin. Solte-o um pouco ao lado."));
          return sendBack(at);
        }
        if (drop.kind === "physical") {
          notify(tx("m_naoEPossivelColocarSobre"));
          return sendBack(at);
        }
        if (drop.kind === "badge") {
          notify(tx("m_naoEPossivelColocarSobre"));
          return sendBack(at);
        }
        if (drop.kind === "out") {
          notify(tx("m_solteOBottonSobreO"));
          return sendBack(at);
        }
        if (drop.kind === "occupied") {
          notify(tx("m_naoEPossivelColocarSobre"));
          return sendBack(at);
        }
        setGhost(null);
        if (src.kind === "placed" && displayDrag) {
          // display da loja: a posição e os espaços cobertos mudam juntos (os espaços que ele deixa ficam livres)
          const cur0 = live.current.badges.find((b) => b.id === src.id);
          const before = cur0 ? { x: cur0.x, y: cur0.y, slots: cur0.slots } : null;
          if (drop.rect) removeOverRef.current?.(drop.rect, 0.02); // botton debaixo do widget volta para a barra
          setBadges((l) => l.map((b) => (b.id === src.id ? { ...b, x: drop.x, y: drop.y, slots: drop.slots ?? [] } : b)));
          void updateDisplayLayout(getBrowserSupabase(), src.id, drop.x, drop.y, src.scale ?? DISPLAY_SCALE, drop.slots ?? []).then((r) => {
            if (!r.ok) {
              if (before) setBadges((l) => l.map((b) => (b.id === src.id ? { ...b, ...before } : b)));
              notify(r.taken ? tx("m_esseLugarAcabouDeReceber") : tx("m_naoFoiPossivelMoverO"));
            }
            live.current.onDisplaysChanged?.();
          });
          return;
        }
        if (src.kind === "placed") {
          setBadges((l) => l.map((b) => (b.id === src.id ? { ...b, x: drop.x, y: drop.y } : b)));
          void moveBadge(getBrowserSupabase(), src.id, drop.x, drop.y).then((ok) => {
            if (!ok) notify(tx("m_naoFoiPossivelMoverO2"));
          });
          return;
        }
        if (!mid) return;
        if (cur.length >= MAX_BADGES) {
          notify(tx("m_oMuralAceitaAteBottons", { v0: MAX_BADGES }));
          return sendBack(at);
        }
        const tmp = `tmp-${Date.now()}`;
        setBadges((l) => [...l, { id: tmp, key: src.key, x: drop.x, y: drop.y, scale: DEFAULT_SCALE }]);
        void addBadge(getBrowserSupabase(), mid, src.key, drop.x, drop.y).then((res) => {
          if ("error" in res) {
            setBadges((l) => l.filter((b) => b.id !== tmp));
            notify(res.error === "sold_out" ? tx("m_semUnidadesCompreMaisDeste") : res.error === "not_owned" ? tx("m_esteBottonEDaLoja") : tx("m_naoFoiPossivelColocarO"));
          } else setBadges((l) => l.map((b) => (b.id === tmp ? { ...b, id: res.id } : b)));
          live.current.onSynced?.();
        });
      }

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKey);
      cleanup.current = () => finish(null, true);
    },
    [setBadges],
  );

  useEffect(() => () => cleanup.current?.(), []);

  // segurar o dedo num botton (na barra ou no mural) e demorar para arrastar abria o menu do navegador (salvar imagem): aqui ele é bloqueado
  useEffect(() => {
    const block = (e: Event) => {
      const t = e.target;
      if (document.body.classList.contains("badge-dragging") || (t instanceof Element && t.closest("[data-badge-bar], [data-badge-id]"))) e.preventDefault();
    };
    document.addEventListener("contextmenu", block, true);
    return () => document.removeEventListener("contextmenu", block, true);
  }, []);

  const hover = useCallback((id: string | null) => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    if (id) setHoverId(id);
    else hoverTimer.current = window.setTimeout(() => setHoverId(null), 180); // dá tempo de o mouse chegar nos controles
  }, []);
  const select = useCallback((id: string | null) => setSelId(id), []);
  const closeControls = useCallback(() => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    setSelId(null);
    setHoverId(null);
  }, []);
  // tocar em qualquer outro lugar fecha os controles (celular)
  useEffect(() => {
    if (!selId) return;
    const away = (ev: PointerEvent) => {
      const t = ev.target as Element | null;
      if (t?.closest("[data-badge-controls]") || t?.closest(`[data-badge-id="${selId}"]`)) return;
      setSelId(null);
    };
    window.addEventListener("pointerdown", away, true);
    return () => window.removeEventListener("pointerdown", away, true);
  }, [selId]);

  /** Tira o botton do mural (volta para a barra): o mesmo que arrastar para a barra. */
  // display de leitura: +/- páginas direto nos controles; a tela muda na hora e o servidor recebe depois de uma pausa
  const pagesTimer = useRef<Record<string, number>>({});
  const changePages = useCallback(
    (id: string, delta: number) => {
      const b = live.current.badges.find((x) => x.id === id);
      if (!b?.data || b.data.product !== "book") return;
      const total = b.data.pages ?? 0;
      const next = Math.min(total, Math.max(0, (b.data.read ?? 0) + delta));
      if (next === (b.data.read ?? 0)) return;
      setBadges((l) => l.map((x) => (x.id === id && x.data ? { ...x, data: { ...x.data, read: next } } : x)));
      window.clearTimeout(pagesTimer.current[id]);
      pagesTimer.current[id] = window.setTimeout(() => {
        const cur = live.current.badges.find((x) => x.id === id);
        if (!cur?.data || id.startsWith("tmp-")) return;
        const { text: _t, ref: _r, product: _p, ...clean } = cur.data;
        void _t;
        void _r;
        void _p;
        void updateDisplayData(getBrowserSupabase(), id, clean).then((ok) => {
          if (!ok) live.current.notify(tx("m_naoFoiPossivelSalvarAs"));
        });
      }, 600);
    },
    [setBadges],
  );
  const removeById = useCallback((id: string) => {
    const { badges: cur, notify } = live.current;
    const prev = cur;
    setSelId(null);
    setHoverId(null);
    setBadges((l) => l.filter((b) => b.id !== id));
    void removeBadge(getBrowserSupabase(), id).then((ok) => {
      if (!ok) {
        setBadges(() => prev);
        notify(tx("m_naoFoiPossivelTirarO"));
      }
      live.current.onSynced?.();
    });
  }, [setBadges]);

  const setDisplaySecret = useCallback(async (id: string, hidden: boolean) => {
    const ok = await setDisplayHidden(getBrowserSupabase(), id, hidden);
    if (ok) setBadges((l) => l.map((b) => (b.id === id ? { ...b, hidden } : b)));
    else live.current.notify(hidden ? tx("m_segredoEDoPinz") : tx("m_naoFoiPossivelMudarAgora"));
    return ok;
  }, [setBadges]);

  /** Inclina na tela enquanto a barra é arrastada (ainda sem salvar). */
  const tilt = useCallback((id: string, deg: number) => {
    const snap = [0, 90, -90, 180, -180].find((t) => Math.abs(deg - t) <= 4);
    const v = Math.max(-MAX_TILT, Math.min(MAX_TILT, Math.round(snap ?? deg)));
    setBadges((l) => l.map((x) => (x.id === id ? { ...x, rotation: v } : x)));
  }, [setBadges]);
  const tiltSaved = useRef<Record<string, number>>({});
  /** Ao soltar a barra: grava a inclinação (se falhar, volta à anterior). */
  const commitTilt = useCallback((id: string) => {
    const { badges: cur, notify } = live.current;
    const b = cur.find((x) => x.id === id);
    if (!b || id.startsWith("tmp-")) return;
    const deg = b.rotation ?? 0;
    const before = tiltSaved.current[id] ?? 0;
    if (deg === before) return;
    void setBadgeRotation(getBrowserSupabase(), id, deg).then((ok) => {
      if (ok) tiltSaved.current[id] = deg;
      else {
        setBadges((l) => l.map((x) => (x.id === id ? { ...x, rotation: before } : x)));
        notify(tx("m_naoFoiPossivelInclinarO"));
      }
    });
  }, [setBadges]);
  // a inclinação já salva de cada botton (referência para o caso de falhar ao salvar)
  useEffect(() => {
    for (const b of badges) {
      tiltSaved.current[b.id] ??= b.rotation ?? 0;
      scaleSaved.current[b.id] ??= b.scale ?? (isDisplayKey(b.key) ? DISPLAY_SCALE : DEFAULT_SCALE);
    }
  }, [badges]);

  /** Muda o tamanho na tela enquanto a barra vertical é arrastada (ainda sem salvar). Perto da ponta de baixo, "gruda" no tamanho de sempre. */
  const rescale = useCallback((id: string, pct: number) => {
    const isDisp = isDisplayKey(live.current.badges.find((x) => x.id === id)?.key ?? 0);
    const near = (isDisp ? [MIN_SCALE, MAX_SCALE] : [MIN_SCALE, DEFAULT_SCALE, MAX_SCALE]).find((t) => Math.abs(pct - t) <= 3); // grudinha no menor, no padrão (meio) e no maior
    const v = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(near ?? pct)));
    setBadges((l) => l.map((x) => (x.id === id ? { ...x, scale: v } : x)));
  }, [setBadges]);
  const scaleSaved = useRef<Record<string, number>>({});
  /** Ao soltar a barra: se ficou maior, tem que caber no lugar; grava o tamanho (se falhar, volta ao anterior). */
  const commitScale = useCallback((id: string) => {
    const { badges: cur, notify } = live.current;
    const b = cur.find((x) => x.id === id);
    if (!b || id.startsWith("tmp-")) return;
    const isDisp = isDisplayKey(b.key);
    const before = scaleSaved.current[id] ?? (isDisp ? DISPLAY_SCALE : DEFAULT_SCALE);
    const pct = b.scale ?? (isDisp ? DISPLAY_SCALE : DEFAULT_SCALE);
    if (pct === before) return;
    const back = () => setBadges((l) => l.map((x) => (x.id === id ? { ...x, scale: before } : x)));
    let nx = b.x;
    let ny = b.y;
    if (pct > before) {
      const el = visibleOne(`[data-badge-id="${id}"]`) as HTMLElement | null; // a tela tem duas cópias do mural (desktop e celular): vale a visível
      const layer = visibleOne("[data-badge-layer]");
      if (el && layer) {
        const lr = layer.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        const em = parseFloat(getComputedStyle(layer).fontSize) || 10;
        const sc = lr.width / ((layer as HTMLElement).offsetWidth || lr.width);
        const w = (baseEmOfBadge(b.key, b.data) * em * sc * pct) / 100;
        const h = w / ratioOfBadge(b.key, b.data);
        const drop = evaluate(r.left + r.width / 2, r.top + r.height / 2, w, h, layer, el, isDisp);
        if (drop.kind === "occupied") {
          back();
          return notify(tx("m_naoEPossivelColocarSobre"));
        }
        if (drop.kind === "tack") {
          back();
          return notify(tl("Um botton não pode ficar sobre o alfinete de um pin. Solte-o um pouco ao lado."));
        }
        if (drop.kind === "physical") {
          back();
          return notify(tx("m_naoEPossivelColocarSobre"));
        }
        if (drop.kind === "badge") {
          back();
          return notify(tx("m_naoEPossivelColocarSobre"));
        }
        if (drop.kind === "ok") {
          nx = drop.x;
          ny = drop.y;
        }
      }
    }
    const sb = getBrowserSupabase();
    if (isDisp) {
      // display: tamanho, posição e espaços cobertos mudam juntos
      let slots = b.slots ?? [];
      const el2 = visibleOne(`[data-badge-id="${id}"]`) as HTMLElement | null;
      const layer2 = visibleOne("[data-badge-layer]");
      if (el2 && layer2) {
        const lr = layer2.getBoundingClientRect();
        const r = el2.getBoundingClientRect();
        const d2 = evaluate(r.left + r.width / 2, r.top + r.height / 2, r.width, r.height, layer2, el2, true);
        if (d2.kind === "ok") {
          nx = d2.x;
          ny = d2.y;
          slots = d2.slots ?? [];
          if (d2.rect) removeOverRef.current?.(d2.rect, 0.02);
        } else if (d2.kind === "occupied") {
          back();
          return notify(tx("m_naoEPossivelColocarSobre"));
        }
        void lr;
      }
      setBadges((l) => l.map((x) => (x.id === id ? { ...x, x: nx, y: ny, slots } : x)));
      void updateDisplayLayout(sb, id, nx, ny, pct, slots).then((res) => {
        if (res.ok) scaleSaved.current[id] = pct;
        else {
          back();
          notify(res.taken ? tx("m_esseLugarAcabouDeReceber2") : tx("m_naoFoiPossivelMudarO"));
        }
        live.current.onDisplaysChanged?.();
      });
      return;
    }
    if (nx !== b.x || ny !== b.y) setBadges((l) => l.map((x) => (x.id === id ? { ...x, x: nx, y: ny } : x)));
    void setBadgeScale(sb, id, pct).then((ok) => {
      if (ok) {
        scaleSaved.current[id] = pct;
        if (Math.abs(nx - b.x) > 0.05 || Math.abs(ny - b.y) > 0.05) void moveBadge(sb, id, nx, ny); // só grava a posição se ela mudou de verdade
      } else {
        back();
        notify(tx("m_naoFoiPossivelMudarO"));
      }
    });
  }, [setBadges]);

  // o display é um produto "categoria:estilo" já comprado: texto (versículo, frase) vai direto para o mural; relógio e clima pedem horário/cidade
  const pickDisplay = useCallback((id: string) => {
    const { product, style } = splitDisplayId(id);
    if (!(isBundled(product) && new Set(displaysRef.current.filter((d) => splitDisplayId(d).product === product).map((d) => baseStyle(splitDisplayId(d).style))).size > 1) && (product === "bible" || product === "motivation" || product === "clock" || product === "cookie" || product === "date")) {
      // o relógio sempre usa a hora do aparelho de quem está vendo: nada a perguntar
      setPlacing({ product, data: product === "clock" ? { product, style, tz: "local" } : { product, style } });
      return;
    }
    setDialogError(null);
    setDialog({ mode: "new", product, style });
  }, []);
  // display escolhido na aba "Displays" do compositor: entra no centro do espaço livre clicado (sem mural escuro); relógio, frase e versículo
  // não pedem nada, o clima abre antes a escolha da cidade
  const placeDisplayAtSlot = useCallback((id: string, slot: number) => {
    const { product, style } = splitDisplayId(id);
    const packed = isBundled(product) && new Set(displaysRef.current.filter((d) => splitDisplayId(d).product === product).map((d) => baseStyle(splitDisplayId(d).style))).size > 1;
    if (packed || product === "weather" || product === "calendar" || product === "countdown" || product === "daycount" || product === "book" || product === "top3" || product === "poll" || product === "habit" || product === "mood") {
      setDialogError(null);
      setDialog({ mode: "new", product, style, slot });
      return;
    }
    void placeAtSlot(product, product === "clock" ? { product, style, tz: "local" } : { product, style }, slot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const placeDisplayDataAtSlot = useCallback((data: DisplayPayload, slot: number) => {
    const { text: _t, ref: _r, product: _p, ...clean } = data;
    void _t;
    void _r;
    void _p;
    void placeAtSlot(data.product, { ...clean, product: data.product } as DisplayPayload, slot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function placeAtSlot(product: string, data: DisplayPayload, slot: number) {
    const layer = visibleLayer();
    const slotEl = [...document.querySelectorAll<HTMLElement>("[data-slot]")].find((el) => visible(el) && Number(el.dataset.slot) === slot);
    if (!layer || !slotEl) return live.current.notify(tx("m_naoFoiPossivelColocarO2"));
    const lr = layer.getBoundingClientRect();
    const em = parseFloat(getComputedStyle(layer).fontSize) || 10;
    const sc = lr.width / (layer.offsetWidth || lr.width);
    const sh = shapeOfStyle(data.style);
    const w = BOARD_EM[sh] * em * sc * (DISPLAY_SCALE / 100);
    const h = w / RATIO[sh];
    const r = slotEl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    // centro do espaço; se os vizinhos estiverem ocupados, desliza meio espaço (ou um) para o lado até achar onde cabe
    for (const dx of [0, r.width * 0.5, -r.width * 0.5, r.width, -r.width]) {
      const d = evaluate(cx + dx, cy, w, h, layer, undefined, true, true);
      if (d.kind === "ok" && (d.slots ?? []).includes(slot)) return placeDisplay(product, data, d.x, d.y, d.slots ?? [], d.rect);
    }
    live.current.notify(tx("m_naoHaEspacoLivreAo"));
  }
  const openDetail = useCallback((id: string) => {
    const b = live.current.badges.find((x) => x.id === id);
    if (!b?.data) return;
    setSelId(null);
    setHoverId(null);
    // o detalhe do quadro (BoardCanvas) abre o widget na fila de pins; sem quadro denso por perto, abre a janela própria
    const ev = new CustomEvent("pinz:open-widget", { detail: { id }, cancelable: true });
    if (window.dispatchEvent(ev)) setDetail({ ...b.data, id: b.id });
  }, []);
  const editDisplay = useCallback((id: string) => {
    const b = live.current.badges.find((x) => x.id === id);
    if (!b?.data) return;
    setSelId(null);
    setHoverId(null);
    setDialogError(null);
    setDialog({ mode: "edit", product: b.data.product, style: b.data.style ?? "", id, initial: b.data });
  }, []);
  async function submitDialog(data: DisplayPayload) {
    if (!dialog) return;
    if (dialog.mode === "new") {
      setDialog(null);
      if (dialog.slot !== undefined) {
        const { text: _t, ref: _r, product: _p, ...clean } = data;
        void _t;
        void _r;
        void _p;
        void placeAtSlot(dialog.product, { ...clean, product: dialog.product } as DisplayPayload, dialog.slot);
        return;
      }
      setPlacing({ product: dialog.product, data }); // o mural escurece e o pin aparece no centro
      return;
    }
    setDialogBusy(true);
    const { text: _t, ref: _r, product: _p, ...clean } = data;
    void _t;
    void _r;
    void _p;
    const ok = dialog.id ? await updateDisplayData(getBrowserSupabase(), dialog.id, clean) : false;
    setDialogBusy(false);
    if (!ok) return setDialogError("Não foi possível salvar agora. Tente de novo.");
    setDialog(null);
    live.current.onDisplaysChanged?.();
  }
  /** O pin foi solto num lugar válido: grava no servidor. */
  async function placeDisplay(product: string, data: DisplayPayload, x: number, y: number, slots: number[], rect?: { left: number; right: number; top: number; bottom: number }) {
    const mid = live.current.muralId;
    setPlacing(null);
    if (!mid) return;
    if (rect) removeOverRef.current?.(rect, 0.02); // botton debaixo do widget volta para a barra
    const { text: _t, ref: _r, product: _p, ...clean } = data;
    void _t;
    void _r;
    void _p;
    const res = await addDisplay(getBrowserSupabase(), mid, product, clean, x, y, slots);
    if ("error" in res) {
      live.current.notify(res.error === "taken" ? tx("m_esseLugarAcabouDeReceber") : res.error === "plan_limit" ? tx("m_oPlanoGratuitoPermiteAte") : res.error === "limit" ? tx("m_oMuralChegouAoMaximo") : res.error === "not_owned" ? tx("m_esteDisplayEDaLoja") : tx("m_naoFoiPossivelColocarO2"));
      live.current.onDisplaysChanged?.();
      return;
    }
    live.current.onDisplaysChanged?.();
    spotLight(`[data-badge-id="${res.id}"]`); // destaca onde o display entrou
  }

  // o dono confere (ao abrir o mural e quando algo muda) se cada widget já tem registrados todos os espaços que cobre: só ACRESCENTA os que faltam,
  // então a conferência nunca desfaz nada e não fica oscilando entre aparelhos
  useEffect(() => {
    if (!editable) return;
    const t = window.setTimeout(() => {
      for (const b of live.current.badges) {
        if (b.kind !== "display" || b.id.startsWith("tmp-")) continue;
        const el = visibleOne(`[data-badge-id="${b.id}"]`) as HTMLElement | null;
        if (!el) continue;
        const { slots, taken } = slotsUnder(el.getBoundingClientRect());
        const have = new Set(b.slots ?? []);
        const missing = slots.filter((s) => !have.has(s) && !taken.includes(s));
        if (!missing.length) continue;
        const next = [...have, ...missing].sort((a, c) => a - c);
        setBadges((l) => l.map((x) => (x.id === b.id ? { ...x, slots: next } : x)));
        void updateDisplayLayout(getBrowserSupabase(), b.id, b.x, b.y, b.scale ?? DISPLAY_SCALE, next).then(() => live.current.onDisplaysChanged?.());
      }
    }, 1500);
    return () => window.clearTimeout(t);
  }, [badges, editable, setBadges]);

  // hábito: o dono marca (ou desmarca) o dia de hoje no próprio cartão
  const habitValue = useMemo(
    () => ({
      canMark: editable,
      check: async (id: string) => {
        const d = new Date();
        const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const { error } = await getBrowserSupabase().rpc("check_habit", { p_id: id, p_day: day });
        if (error) {
          live.current.notify(tl("Não foi possível salvar agora. Tente de novo."));
          return false;
        }
        live.current.onDisplaysChanged?.();
        return true;
      },
    }),
    [editable],
  );
  const openStoreRef = useRef(onOpenStore);
  openStoreRef.current = onOpenStore;
  // bottons agora podem ficar por cima de pins e displays: nada volta para a barra por estar debaixo de um pin ou display (o gancho continua para quem o chama)
  const removeOver = useCallback((rect: { left: number; right: number; top: number; bottom: number }, minOverlap?: number) => {
    void rect;
    void minOverlap;
  }, []);
  removeOverRef.current = removeOver;
  const value = useMemo(() => ({ badges, editable, draggingId, draggingNew, stock, acquiredAt, openStore: () => openStoreRef.current(), begin, hover, select, removeOver, displays, pickDisplay, editDisplay, placing: !!placing, openDetail, canDisplays, placeDisplayAtSlot, placeDisplayDataAtSlot, removeDisplay: removeById, setDisplaySecret }), [badges, editable, draggingId, draggingNew, stock, acquiredAt, begin, hover, select, removeOver, displays, pickDisplay, editDisplay, placing, openDetail, canDisplays, placeDisplayAtSlot, placeDisplayDataAtSlot, removeById, setDisplaySecret]);
  const controlsId = editable && !draggingId ? (selId ?? hoverId) : null;

  return (
    <BadgeCtx.Provider value={value}>
      <HabitCtx.Provider value={habitValue}>{children}</HabitCtx.Provider>
      {dialog && (
        <DisplayDialog
          open
          product={dialog.product}
          style={dialog.style}
          styles={dialog.mode === "new" && isBundled(dialog.product) ? displays.filter((id) => splitDisplayId(id).product === dialog.product).map((id) => splitDisplayId(id).style) : undefined}
          initial={dialog.initial}
          editing={dialog.mode === "edit"}
          busy={dialogBusy}
          error={dialogError}
          onClose={() => setDialog(null)}
          onSubmit={(d) => void submitDialog(d as DisplayPayload)}
        />
      )}
      {detail && <DisplayDetail data={detail} onClose={() => setDetail(null)} />}
      {placing && <PlacingOverlay product={placing.product} data={placing.data} onCancel={() => setPlacing(null)} onDrop={(x, y, slots, rect) => void placeDisplay(placing.product, placing.data, x, y, slots, rect)} notify={notify} />}
      {controlsId && <BadgeControls onEdit={editDisplay} onDetail={openDetail} onPages={changePages} id={controlsId} badge={badges.find((b) => b.id === controlsId)} onScale={rescale} onScaleEnd={commitScale} onRemove={removeById} onKeep={hover} onClose={closeControls} onTilt={tilt} onTiltEnd={commitTilt} />}
      {ghost && isDisplayKey(ghost.key) && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[400] rounded-[12%]"
          style={{
            left: (ghost.back ?? ghost).x - ghost.w / 2,
            top: (ghost.back ?? ghost).y - ghost.h / 2,
            width: ghost.w,
            height: ghost.h,
            transition: ghost.back ? "left 0.26s ease, top 0.26s ease, opacity 0.26s ease" : "none",
            opacity: ghost.back ? 0.2 : ghost.state === "bad" ? 0.55 : 0.9,
            background: ghost.state === "bad" ? "linear-gradient(145deg,#e9b4aa,#a23b2a)" : "linear-gradient(145deg,#f6e2b0,#b88a3a)",
            boxShadow: "0 6px 14px rgba(0,0,0,.45)",
            transform: ghost.rot !== undefined ? `rotate(${ghost.rot}deg)` : undefined,
          }}
        />
      )}
      {ghost && !isDisplayKey(ghost.key) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={badgeSrc(ghost.key)}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none fixed z-[400] select-none"
          style={{
            left: (ghost.back ?? ghost).x - ghost.w / 2,
            top: (ghost.back ?? ghost).y - ghost.h / 2,
            width: ghost.w,
            height: ghost.h,
            transition: ghost.back ? "left 0.26s ease, top 0.26s ease, opacity 0.26s ease" : "none",
            opacity: ghost.back ? 0.2 : ghost.state === "bad" ? 0.6 : 1,
            transform: ghost.rot !== undefined ? `rotate(${ghost.rot}deg)${ghost.back ? " scale(0.8)" : ""}` : ghost.back ? "scale(0.8)" : "scale(1.12) rotate(-6deg)",
            filter: `drop-shadow(0 6px 8px rgba(0,0,0,.45))${ghost.state === "bad" && !ghost.back ? " grayscale(0.6)" : ""}`,
          }}
        />
      )}
    </BadgeCtx.Provider>
  );
}

/**
 * Controles do botton: uma barra vertical de tamanho + lixeira ao lado dele e uma barra horizontal de inclinação abaixo.
 * Tamanho de tela fixo (não encolhe com o zoom do celular) e posição presa ao CENTRO do botton, a uma distância fixa:
 * não anda quando o botton cresce ou gira. Seguem o botton se o quadro for arrastado ou ampliado.
 */
function BadgeControls({ id, badge, onEdit, onDetail, onPages, onScale, onScaleEnd, onRemove, onKeep, onClose, onTilt, onTiltEnd }: { onEdit: (id: string) => void; onDetail: (id: string) => void; /** display de leitura: mais ou menos páginas lidas, sem abrir a edição */ onPages: (id: string, delta: number) => void; id: string; badge?: PlacedBadge; onScale: (id: string, pct: number) => void; onScaleEnd: (id: string) => void; onRemove: (id: string) => void; onKeep: (id: string | null) => void; onClose: () => void; onTilt: (id: string, deg: number) => void; onTiltEnd: (id: string) => void }) {
  const tx = useTranslations("components.badges.BadgeContext");
  const [g, setG] = useState<{ cx: number; cy: number; Rx: number; Ry: number } | null>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = visibleOne(`[data-badge-id="${id}"]`) as HTMLElement | null;
      const r = el?.getBoundingClientRect();
      let next: { cx: number; cy: number; Rx: number; Ry: number } | null = null;
      if (el && r && r.width > 0) {
        // os botões ficam junto do botton: metade da largura e da altura que ele ocupa na tela agora (já com a inclinação); seguem o botton se ele crescer ou girar
        next = { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), Rx: Math.round(r.width / 2 + 4), Ry: Math.round(r.height / 2 + 4) };
      }
      setG((p) => (p && next && p.cx === next.cx && p.cy === next.cy && p.Rx === next.Rx && p.Ry === next.Ry ? p : next));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [id]);
  if (!g || !badge || typeof document === "undefined") return null;

  const isDisp = isDisplayKey(badge.key);
  const scale = badge.scale ?? (isDisp ? DISPLAY_SCALE : DEFAULT_SCALE);
  const deg = badge.rotation ?? 0;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // duas pílulas: o tamanho (à direita do botton; à esquerda se não couber) e os botões excluir/editar/ampliar (do outro lado, à esquerda)
  const W = 40;
  const TRACK = 90; // mesmo comprimento da barra de inclinação
  const Hh = 124;
  // versículo, frase e relógio não têm o que editar (o estilo é o comprado): só ampliar e tirar
  const canEdit = isDisp && (badge.data?.product === "weather" || badge.data?.product === "calendar" || badge.data?.product === "countdown" || badge.data?.product === "daycount" || badge.data?.product === "book" || badge.data?.product === "top3" || badge.data?.product === "poll" || badge.data?.product === "habit" || badge.data?.product === "mood");
  const isBook = isDisp && badge.data?.product === "book";
  const Ha = (canEdit ? 108 : isDisp ? 76 : 42) + (isBook ? 78 : 0);
  // a pílula fica longe o bastante para a barra de inclinação (centrada embaixo do botton) caber sem encostar nela
  const SW = 140;
  const off = Math.max(g.Rx + 8, SW / 2 + 8);
  const sizeRight = g.cx + off + W <= vw - 4;
  const pLeft = sizeRight ? g.cx + off : Math.max(4, g.cx - off - W);
  const pTop = Math.min(Math.max(g.cy - Hh / 2, 44), vh - Hh - 8);
  const aLeft = sizeRight
    ? g.cx - off - W >= 4
      ? g.cx - off - W
      : Math.min(pLeft + W + 6, vw - W - 4)
    : Math.max(4, pLeft - W - 6);
  const aTop = Math.min(Math.max(g.cy - Ha / 2, 44), vh - Ha - 8);

  // barra de inclinação: pequena, centrada logo abaixo do botton; só desce para baixo da pílula se as duas se encostarem
  const SH = 66;
  const sLeft = Math.min(Math.max(g.cx - SW / 2, 4), vw - SW - 4);
  const under = g.cy + g.Ry + 6;
  const touchesPill = sLeft < pLeft + W && sLeft + SW > pLeft && under < pTop + Hh && under + SH > pTop;
  const lowest = touchesPill ? pTop + Hh + 6 : under;
  const sTop = lowest + SH <= vh - 8 ? lowest : Math.max(8, Math.min(g.cy - g.Ry, pTop) - 6 - SH);

  return createPortal(
    <>
      <div
        data-badge-controls
        onPointerEnter={() => onKeep(id)}
        onPointerLeave={() => onKeep(null)}
        className="fixed z-[350] flex touch-none flex-col items-center rounded-xl bg-[#17110c]/92 px-1.5 pt-1 pb-0.5 text-white shadow-[0_0.25rem_0.8rem_rgba(0,0,0,.5)] backdrop-blur"
        style={{ left: sLeft, top: sTop, width: SW }}
      >
        <div className="flex w-full items-center justify-center gap-1">
          <span aria-hidden className="text-sm leading-none opacity-80" title={tx("antiHorario")}>
            ↺
          </span>
          <TouchSlider value={deg} min={-MAX_TILT} max={MAX_TILT} onChange={(v) => onTilt(id, v)} onEnd={() => onTiltEnd(id)} length={SW - 50} label={tx("inclinarOBottonParaA")} />
          <span aria-hidden className="text-sm leading-none opacity-80" title={tx("horario")}>
            ↻
          </span>
        </div>
        <button
          type="button"
          aria-label={tx("restaurarDeixaOBottonReto")}
          disabled={deg === 0}
          onClick={() => {
            onTilt(id, 0);
            window.setTimeout(() => onTiltEnd(id), 0);
          }}
          className="mt-1.5 mb-0.5 min-h-8 cursor-pointer rounded-lg px-4 py-1.5 text-xs leading-none font-semibold text-[#f6c93f] transition hover:bg-white/10 active:bg-white/20 disabled:cursor-default disabled:text-white/40 disabled:hover:bg-transparent"
        >
          {tx("restaurar")}</button>
      </div>

      <div
        data-badge-controls
        role="toolbar"
        aria-label={tx("tamanhoEPosicaoDoBotton")}
        onPointerEnter={() => onKeep(id)}
        onPointerLeave={() => onKeep(null)}
        className="fixed z-[350] flex touch-none flex-col items-center gap-0.5 rounded-full bg-[#17110c]/92 p-[3px] shadow-[0_0.3rem_1rem_rgba(0,0,0,.5)] backdrop-blur"
        style={{ left: pLeft, top: pTop, width: W, height: Hh }}
      >
        {/* tamanho: em cima maior, embaixo menor (o menor é o tamanho de sempre) */}
        <span aria-hidden className="mt-1.5 size-2.5 rounded-full bg-white/80" title={tx("maior")} />
        <TouchSlider vertical value={scale} min={MIN_SCALE} max={MAX_SCALE} onChange={(v) => onScale(id, v)} onEnd={() => onScaleEnd(id)} length={TRACK} label={tx("tamanhoDoBottonParaCima")} />
        <span aria-hidden className="size-1.5 rounded-full bg-white/80" title={tx("menor")} />
      </div>

      <div
        data-badge-controls
        role="toolbar"
        aria-label={tx("acoesDoBotton")}
        onPointerEnter={() => onKeep(id)}
        onPointerLeave={() => onKeep(null)}
        className="fixed z-[350] flex touch-none flex-col items-center justify-center gap-0.5 rounded-full bg-[#17110c]/92 p-[3px] shadow-[0_0.3rem_1rem_rgba(0,0,0,.5)] backdrop-blur"
        style={{ left: aLeft, top: aTop, width: W, height: Ha }}
      >
        {isBook && (
          <>
            {/* páginas lidas: toque soma/tira uma; segurando, anda rápido */}
            <PagesStep dir={1} onStep={(d) => onPages(id, d)} />
            <span className="text-[11px] leading-none font-extrabold tabular-nums" aria-live="polite" title={tx("paginasLidas")}>
              {badge.data?.read ?? 0}
            </span>
            <PagesStep dir={-1} onStep={(d) => onPages(id, d)} />
            <span aria-hidden className="my-0.5 h-px w-5 bg-white/25" />
          </>
        )}
        {isDisp && (
          <button type="button" onClick={() => onDetail(id)} aria-label={tx("verODisplayEmTamanho")} title={tx("verEmTamanhoGrande")} className="grid size-7 cursor-pointer place-items-center rounded-full text-white transition hover:bg-white/20 active:scale-90">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
        )}
        {canEdit && (
          <button type="button" onClick={() => onEdit(id)} aria-label={tx("editarODisplayContornoHorario")} title={tx("editar")} className="grid size-7 cursor-pointer place-items-center rounded-full text-white transition hover:bg-white/20 active:scale-90">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />
            </svg>
          </button>
        )}
        <button type="button" onClick={() => onRemove(id)} aria-label={isDisp ? tx("m_tirarODisplayDoMural") : tx("m_tirarOBottonDoMural")} title={tx("tirarDoMural")} className={`mb-0.5 grid size-7 cursor-pointer place-items-center rounded-full text-white transition hover:bg-white/20 active:scale-90`}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />
          </svg>
        </button>
      </div>
      <button
        type="button"
        data-badge-controls
        aria-label={tx("fecharAsOpcoesDoBotton")}
        title={tx("fechar")}
        onClick={onClose}
        className="fixed z-[350] grid size-8 cursor-pointer place-items-center rounded-full bg-[#17110c]/92 text-white shadow-[0_0.25rem_0.8rem_rgba(0,0,0,.5)] backdrop-blur transition hover:bg-black active:scale-90"
        style={{ left: pLeft + W / 2 - 16, top: pTop - 38 }}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </>,
    document.body,
  );
}

/** Botão de mais ou menos páginas: um toque muda uma página; segurando, repete cada vez mais rápido. */
function PagesStep({ dir, onStep }: { dir: 1 | -1; onStep: (d: number) => void }) {
  const tx = useTranslations("components.badges.BadgeContext");
  const timer = useRef<number | null>(null);
  const stop = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => stop, []);
  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stop();
    onStep(dir);
    let n = 0;
    timer.current = window.setTimeout(() => {
      timer.current = window.setInterval(() => {
        n++;
        onStep(dir * (n > 12 ? 10 : n > 6 ? 3 : 1));
      }, 90);
    }, 380);
  };
  return (
    <button
      type="button"
      aria-label={dir > 0 ? tx("m_maisUmaPaginaLida") : tx("m_menosUmaPaginaLida")}
      title={dir > 0 ? tx("m_maisPaginas") : tx("m_menosPaginas")}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onStep(dir))}
      className="grid size-7 cursor-pointer touch-none place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/25 active:scale-90"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
        <path d={dir > 0 ? "M12 5v14M5 12h14" : "M5 12h14"} />
      </svg>
    </button>
  );
}

const visibleLayer = () => visibleOne("[data-badge-layer]") as HTMLElement | null;

/**
 * Pin da loja escolhido: o mural fica escuro, o pin aparece no centro do quadro e a pessoa o arrasta para onde quiser.
 * Só vale sobre espaços livres (os espaços que o pin cobrir deixam de receber post-its, fotos e vídeos).
 */
function PlacingOverlay({ product, data, onCancel, onDrop, notify }: { product: string; data: DisplayPayload; onCancel: () => void; onDrop: (x: number, y: number, slots: number[], rect?: { left: number; right: number; top: number; bottom: number }) => void; notify: (m: string) => void }) {
  const tx = useTranslations("components.badges.BadgeContext");
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ w: 120, h: 120 });
  const [state, setState] = useState<"ok" | "bad">("ok");
  const [dragging, setDragging] = useState(false);
  const layerRef = useRef<HTMLElement | null>(null);

  // o pin começa no centro do quadro, no tamanho que terá no mural
  useEffect(() => {
    const layer = visibleLayer();
    layerRef.current = layer;
    if (!layer) return onCancel();
    const lr = layer.getBoundingClientRect();
    const em = parseFloat(getComputedStyle(layer).fontSize) || 10;
    const sc = lr.width / (layer.offsetWidth || lr.width);
    const sh = shapeOfStyle(data.style);
    const w = BOARD_EM[sh] * em * sc * (DISPLAY_SCALE / 100);
    setSize({ w, h: w / RATIO[sh] });
    setPos({ x: lr.left + lr.width / 2, y: lr.top + lr.height / 2 });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pos || typeof document === "undefined") return null;
  const check = (x: number, y: number) => {
    const layer = layerRef.current;
    if (!layer) return null;
    return evaluate(x, y, size.w, size.h, layer, undefined, true);
  };

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = pos.x;
    const oy = pos.y;
    setDragging(true);
    const move = (ev: PointerEvent) => {
      const x = ox + ev.clientX - sx;
      const y = oy + ev.clientY - sy;
      setPos({ x, y });
      const d = check(x, y);
      setState(d && d.kind === "ok" ? "ok" : "bad");
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDragging(false);
      const x = ox + ev.clientX - sx;
      const y = oy + ev.clientY - sy;
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return; // foi só um toque
      const d = check(x, y);
      if (!d) return;
      if (d.kind === "ok") return onDrop(d.x, d.y, d.slots ?? [], d.rect);
      notify(d.kind === "occupied" || d.kind === "badge" ? tx("m_naoEPossivelColocarSobre") : tx("m_solteODisplaySobreO"));
      const lr = layerRef.current?.getBoundingClientRect();
      if (lr) setPos({ x: lr.left + lr.width / 2, y: lr.top + lr.height / 2 }); // volta ao centro
      setState("ok");
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const ring = state === "ok" ? "#6fdc8c" : "#ff8a7a";
  const cardStyle: CSSProperties = { fontSize: size.w / NATURAL_W[shapeOfStyle(data.style)] + "px", outline: dragging ? "3px solid " + ring : "none", outlineOffset: "4px", borderRadius: "1.4em" };

  return createPortal(
    <div className="fixed inset-0 z-[380]" role="dialog" aria-label={tx("posicionarODisplayNoMural")}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
      <p className="absolute top-4 left-1/2 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl bg-[#17110c]/92 px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_0.4rem_1.4rem_rgba(0,0,0,.5)]">
        {tx("arrasteODisplayESolte")}</p>
      <div
        onPointerDown={start}
        className="absolute touch-none select-none"
        style={{ left: pos.x - size.w / 2, top: pos.y - size.h / 2, width: size.w, height: size.h, cursor: dragging ? "grabbing" : "grab", filter: "drop-shadow(0 10px 18px rgba(0,0,0,.55))" }}
      >
        <div className="pointer-events-none" style={cardStyle}>
          <DisplayCard data={data} />
        </div>
      </div>
      <button type="button" onClick={onCancel} className="absolute bottom-6 left-1/2 -translate-x-1/2 cursor-pointer rounded-xl bg-white/90 px-5 py-2.5 text-sm font-bold text-[#2a1c12] shadow-[0_0.3rem_1rem_rgba(0,0,0,.5)] transition hover:bg-white active:scale-95">
        {tx("cancelar")}</button>
    </div>,
    document.body,
  );
}
