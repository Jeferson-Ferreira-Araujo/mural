"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { addBadge, addDisplay, badgeDef, badgeSrc, baseEmOf, DEFAULT_SCALE, DISPLAY_SCALE, isDisplayKey, MAX_BADGES, MAX_SCALE, MAX_TILT, MIN_SCALE, moveBadge, PHYSICAL_TYPES, ratioOfKey, removeBadge, setBadgeRotation, setBadgeScale, updateDisplayData, updateDisplayLayout, type DisplayPayload, type PlacedBadge, type Stock } from "@/lib/badges";
import { getBrowserSupabase } from "@/lib/supabase";
import { DisplayCard, WIDGET_W } from "../widgets";
import { DisplayDialog } from "./DisplayDialog";
import { TouchSlider } from "./TouchSlider";

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
  begin: (e: PointerEvent, src: DragSrc, sourceEl: HTMLElement) => void;
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
};

const unlimited = (): Stock => ({ owned: true, left: 1, total: 1 }); // padrão sem loja carregada
const BadgeCtx = createContext<Ctx>({ badges: [], editable: false, draggingId: null, draggingNew: false, stock: unlimited, acquiredAt: () => undefined, openStore: () => undefined, begin: () => undefined, hover: () => undefined, select: () => undefined, removeOver: () => undefined, displays: [], pickDisplay: () => undefined, editDisplay: () => undefined, placing: false });
export const useBadges = () => useContext(BadgeCtx);

type Drop = { kind: "ok"; x: number; y: number; /** displays: espaços do quadro cobertos */ slots?: number[]; /** displays: a área que ocupam na tela (os bottons ali voltam para a barra) */ rect?: { left: number; right: number; top: number; bottom: number } } | { kind: "physical" } | { kind: "badge" } | { kind: "out" } | { kind: "bar" } | { kind: "occupied" };
type Ghost = { key: number; x: number; y: number; w: number; h: number; state: "ok" | "bad"; /** inclinação do botton já colocado: o arraste mostra o botton como ele é */ rot?: number; back?: { x: number; y: number } };

const visible = (el: Element | null) => !!el && el.getBoundingClientRect().width > 0 && (el as HTMLElement).offsetParent !== null;
const visibleOne = (sel: string) => [...document.querySelectorAll(sel)].find(visible) ?? null;
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), Math.max(a, b));

/** Onde o botom cai se for solto em (px, py)? Respeita o quadro, os pinz físicos e as tachinhas. */
function evaluate(px: number, py: number, w: number, h: number, layer: Element, ignore?: Element, display = false): Drop {
  const bar = visibleOne("[data-badge-bar]");
  if (bar) {
    const b = bar.getBoundingClientRect();
    if (px >= b.left && px <= b.right && py >= b.top && py <= b.bottom) return { kind: "bar" };
  }
  const lr = layer.getBoundingClientRect();
  const m = 6;
  if (px < lr.left - m || px > lr.right + m || py < lr.top - m || py > lr.bottom + m) return { kind: "out" };

  const onPhysical = (x: number, y: number) =>
    document.elementsFromPoint(x, y).some((el) => {
      const pin = el.closest<HTMLElement>("[data-pin-type]");
      return !!pin && (PHYSICAL_TYPES as readonly string[]).includes(pin.dataset.pinType ?? "");
    });
  // pinz físicos (aparelhos): vale o ponto onde o botom foi solto E o botom inteiro (não pode cobrir nem um pedaço do aparelho)
  const physical = [...document.querySelectorAll<HTMLElement>("[data-pin-type]")]
    .filter((p) => visible(p) && (PHYSICAL_TYPES as readonly string[]).includes(p.dataset.pinType ?? ""))
    .map((p) => p.getBoundingClientRect());
  const coversPhysical = (x: number, y: number) => {
    const hw = (w * 0.85) / 2;
    const hh = (h * 0.85) / 2;
    return physical.some((r) => x + hw > r.left && x - hw < r.right && y + hh > r.top && y - hh < r.bottom);
  };
  // outros botons já colocados (o que está sendo arrastado não conta): não pode ficar um sobre o outro
  const others = [...layer.children].filter((c) => c !== ignore).map((c) => c.getBoundingClientRect());
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
    if (dOthers.some((o) => dx + (w * 0.8) / 2 > o.left + o.width * 0.1 && dx - (w * 0.8) / 2 < o.right - o.width * 0.1 && dy + (h * 0.8) / 2 > o.top + o.height * 0.1 && dy - (h * 0.8) / 2 < o.bottom - o.height * 0.1)) return { kind: "badge" };
    const rect = { left: dx - w / 2, right: dx + w / 2, top: dy - h / 2, bottom: dy + h / 2 };
    const slots: number[] = [];
    let taken = false;
    for (const el of document.querySelectorAll<HTMLElement>("[data-slot]")) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      const ix = Math.min(r.right, rect.right) - Math.max(r.left, rect.left);
      const iy = Math.min(r.bottom, rect.bottom) - Math.max(r.top, rect.top);
      if (ix > 0 && iy > 0 && (ix * iy) / (r.width * r.height) >= 0.12) {
        slots.push(Number(el.dataset.slot));
        if (el.hasAttribute("data-pin-id")) taken = true;
      }
    }
    if (taken) return { kind: "occupied" };
    return { kind: "ok", x: ((dx - lr.left) / lr.width) * 100, y: ((dy - lr.top) / lr.height) * 100, slots, rect };
  }
  if (onPhysical(px, py) || coversPhysical(clamp(px, lr.left + w / 2, lr.right - w / 2), clamp(py, lr.top + h / 2, lr.bottom - h / 2))) return { kind: "physical" };

  let cx = clamp(px, lr.left + w / 2, lr.right - w / 2);
  const cy = clamp(py, lr.top + h / 2, lr.bottom - h / 2);

  // tachinha no caminho: o botom vai um pouco para o lado
  const gap = Math.max(2, w * 0.08);
  const tacks = [...document.querySelectorAll("[data-tack]")].filter(visible).map((t) => t.getBoundingClientRect());
  const hit = (x: number) => tacks.find((t) => x + w / 2 > t.left - gap && x - w / 2 < t.right + gap && cy + h / 2 > t.top - gap && cy - h / 2 < t.bottom + gap);
  for (let i = 0; i < 8; i++) {
    const t = hit(cx);
    if (!t) break;
    const right = t.right + gap + w / 2;
    const left = t.left - gap - w / 2;
    const roomR = right <= lr.right - w / 2;
    const roomL = left >= lr.left + w / 2;
    const preferRight = px >= (t.left + t.right) / 2;
    cx = preferRight ? (roomR ? right : roomL ? left : right) : roomL ? left : roomR ? right : left;
    cx = clamp(cx, lr.left + w / 2, lr.right - w / 2);
  }
  if (cx !== px && (onPhysical(cx, cy) || coversPhysical(cx, cy))) return { kind: "physical" };
  if (coversBadge(cx, cy)) return { kind: "badge" };
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
  /** um display foi colocado, mudou de lugar ou foi editado: hora de reler o mural */
  onDisplaysChanged?: () => void;
  children: ReactNode;
}) {
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingNew, setDraggingNew] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const hoverTimer = useRef<number | null>(null);
  // pins da loja: diálogo de opções (novo ou edição) e o modo em que o mural escurece para a pessoa arrastar o pin ao lugar que quiser
  const [dialog, setDialog] = useState<{ mode: "new" | "edit"; product: string; id?: string; initial?: DisplayPayload } | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [placing, setPlacing] = useState<{ product: string; data: DisplayPayload } | null>(null);
  const live = useRef({ muralId, editable, badges, notify, stock, onSynced, onDisplaysChanged });
  live.current = { muralId, editable, badges, notify, stock, onSynced, onDisplaysChanged };
  const cleanup = useRef<(() => void) | null>(null);
  const removeOverRef = useRef<((rect: { left: number; right: number; top: number; bottom: number }, minOverlap?: number) => void) | null>(null);

  const begin = useCallback(
    (e: PointerEvent, src: DragSrc, sourceEl: HTMLElement) => {
      if (!live.current.editable || e.button > 0) return;
      if (src.kind === "new") {
        const st = live.current.stock(src.key);
        if (!st.owned || st.left === 0) {
          // esgotado: só não arrasta, sem aviso; botton da loja ainda não comprado: avisa
          if (!st.owned) live.current.notify("Este botton é da loja. Libere com créditos para usar.");
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
      const activate = () => {
        active = true;
        layer = visibleOne("[data-badge-layer]");
        if (layer) {
          const lr = layer.getBoundingClientRect();
          const em = parseFloat(getComputedStyle(layer).fontSize) || 10;
          const scale = lr.width / ((layer as HTMLElement).offsetWidth || lr.width);
          const w = baseEmOf(src.key) * em * scale * ((src.kind === "placed" ? (src.scale ?? (displayDrag ? DISPLAY_SCALE : DEFAULT_SCALE)) : displayDrag ? DISPLAY_SCALE : DEFAULT_SCALE) / 100);
          size = { w, h: w / ratioOfKey(src.key) };
        }
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
          if (src.kind === "new" && touch) {
            // na barra, no toque: gesto horizontal rola a barra; para cima/baixo arrasta o botom
            if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) return finish(null, true);
            if (Math.abs(dy) < 8) return;
          } else if (Math.hypot(dx, dy) < 4) return;
          activate();
        }
        ev.preventDefault();
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
                notify("Não foi possível tirar o botton agora.");
              }
              live.current.onSynced?.(); // só agora o servidor já contou a devolução: atualiza o número da barra
            });
          } else sendBack(at);
          return;
        }
        if (drop.kind === "physical") {
          notify('Não dá para colocar sobre pinz "físicos".');
          return sendBack(at);
        }
        if (drop.kind === "badge") {
          notify("Não dá para colocar um botton sobre outro botton.");
          return sendBack(at);
        }
        if (drop.kind === "out") {
          notify("Solte o botton sobre o mural.");
          return sendBack(at);
        }
        if (drop.kind === "occupied") {
          notify("Esse lugar já tem um pin. Solte sobre espaços livres do mural.");
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
              notify(r.taken ? "Esse lugar acabou de receber um pin. Escolha outro." : "Não foi possível mover o pin agora.");
            }
            live.current.onDisplaysChanged?.();
          });
          return;
        }
        if (src.kind === "placed") {
          setBadges((l) => l.map((b) => (b.id === src.id ? { ...b, x: drop.x, y: drop.y } : b)));
          void moveBadge(getBrowserSupabase(), src.id, drop.x, drop.y).then((ok) => {
            if (!ok) notify("Não foi possível mover o botton agora.");
          });
          return;
        }
        if (!mid) return;
        if (cur.length >= MAX_BADGES) {
          notify(`O mural aceita até ${MAX_BADGES} Bottons.`);
          return sendBack(at);
        }
        const tmp = `tmp-${Date.now()}`;
        setBadges((l) => [...l, { id: tmp, key: src.key, x: drop.x, y: drop.y, scale: DEFAULT_SCALE }]);
        void addBadge(getBrowserSupabase(), mid, src.key, drop.x, drop.y).then((res) => {
          if ("error" in res) {
            setBadges((l) => l.filter((b) => b.id !== tmp));
            notify(res.error === "sold_out" ? "Sem unidades: compre mais deste botton na loja ou tire um do mural." : res.error === "not_owned" ? "Este botton é da loja. Libere com créditos para usar." : "Não foi possível colocar o botton agora.");
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
  const removeById = useCallback((id: string) => {
    const { badges: cur, notify } = live.current;
    const prev = cur;
    setSelId(null);
    setHoverId(null);
    setBadges((l) => l.filter((b) => b.id !== id));
    void removeBadge(getBrowserSupabase(), id).then((ok) => {
      if (!ok) {
        setBadges(() => prev);
        notify("Não foi possível tirar o botton agora.");
      }
      live.current.onSynced?.();
    });
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
        notify("Não foi possível inclinar o botton agora.");
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
        const w = (baseEmOf(b.key) * em * sc * pct) / 100;
        const h = w / ratioOfKey(b.key);
        const drop = evaluate(r.left + r.width / 2, r.top + r.height / 2, w, h, layer, el, isDisp);
        if (drop.kind === "occupied") {
          back();
          return notify("Não há espaço para aumentar: ele cobriria um pin.");
        }
        if (drop.kind === "physical") {
          back();
          return notify("Não há espaço para aumentar: o botton cobriria um pinz.");
        }
        if (drop.kind === "badge") {
          back();
          return notify("Não há espaço para aumentar: ele encostaria em outro botton.");
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
          return notify("Não há espaço para aumentar: ele cobriria um pin.");
        }
        void lr;
      }
      setBadges((l) => l.map((x) => (x.id === id ? { ...x, x: nx, y: ny, slots } : x)));
      void updateDisplayLayout(sb, id, nx, ny, pct, slots).then((res) => {
        if (res.ok) scaleSaved.current[id] = pct;
        else {
          back();
          notify(res.taken ? "Esse lugar acabou de receber um pin." : "Não foi possível mudar o tamanho agora.");
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
        notify("Não foi possível mudar o tamanho agora.");
      }
    });
  }, [setBadges]);

  const pickDisplay = useCallback((product: string) => {
    setDialogError(null);
    setDialog({ mode: "new", product });
  }, []);
  const editDisplay = useCallback((id: string) => {
    const b = live.current.badges.find((x) => x.id === id);
    if (!b?.data) return;
    setSelId(null);
    setHoverId(null);
    setDialogError(null);
    setDialog({ mode: "edit", product: b.data.product, id, initial: b.data });
  }, []);
  async function submitDialog(data: DisplayPayload) {
    if (!dialog) return;
    if (dialog.mode === "new") {
      setDialog(null);
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
      live.current.notify(res.error === "taken" ? "Esse lugar acabou de receber um pin. Escolha outro." : res.error === "limit" ? "O mural aceita até 12 pins da loja." : res.error === "not_owned" ? "Este pin é da loja. Libere com créditos para usar." : "Não foi possível colocar o pin agora.");
    }
    live.current.onDisplaysChanged?.();
  }

  const openStoreRef = useRef(onOpenStore);
  openStoreRef.current = onOpenStore;
  const removeOver = useCallback(
    (rect: { left: number; right: number; top: number; bottom: number }, minOverlap = 0.1) => {
      const mine = new Set(live.current.badges.filter((b) => b.mine !== false && !isDisplayKey(b.key)).map((b) => b.id)); // só bottons comuns voltam para a barra, nunca outros widgets
      for (const el of document.querySelectorAll<HTMLElement>("[data-badge-id]")) {
        const id = el.dataset.badgeId;
        if (!id || !mine.has(id) || !visible(el)) continue;
        const r = el.getBoundingClientRect();
        const mx = r.width * minOverlap;
        const my = r.height * minOverlap; // só conta se o botton cobre um pedaço de verdade
        if (r.right - mx > rect.left && r.left + mx < rect.right && r.bottom - my > rect.top && r.top + my < rect.bottom) removeById(id);
      }
    },
    [removeById],
  );
  removeOverRef.current = removeOver;
  const value = useMemo(() => ({ badges, editable, draggingId, draggingNew, stock, acquiredAt, openStore: () => openStoreRef.current(), begin, hover, select, removeOver, displays, pickDisplay, editDisplay, placing: !!placing }), [badges, editable, draggingId, draggingNew, stock, acquiredAt, begin, hover, select, removeOver, displays, pickDisplay, editDisplay, placing]);
  const controlsId = editable && !draggingId ? (selId ?? hoverId) : null;

  return (
    <BadgeCtx.Provider value={value}>
      {children}
      {dialog && (
        <DisplayDialog
          open
          product={dialog.product}
          initial={dialog.initial}
          editing={dialog.mode === "edit"}
          busy={dialogBusy}
          error={dialogError}
          onClose={() => setDialog(null)}
          onSubmit={(d) => void submitDialog(d as DisplayPayload)}
        />
      )}
      {placing && <PlacingOverlay product={placing.product} data={placing.data} onCancel={() => setPlacing(null)} onDrop={(x, y, slots, rect) => void placeDisplay(placing.product, placing.data, x, y, slots, rect)} notify={notify} />}
      {controlsId && <BadgeControls onEdit={editDisplay} id={controlsId} badge={badges.find((b) => b.id === controlsId)} onScale={rescale} onScaleEnd={commitScale} onRemove={removeById} onKeep={hover} onClose={closeControls} onTilt={tilt} onTiltEnd={commitTilt} />}
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
function BadgeControls({ id, badge, onEdit, onScale, onScaleEnd, onRemove, onKeep, onClose, onTilt, onTiltEnd }: { onEdit: (id: string) => void; id: string; badge?: PlacedBadge; onScale: (id: string, pct: number) => void; onScaleEnd: (id: string) => void; onRemove: (id: string) => void; onKeep: (id: string | null) => void; onClose: () => void; onTilt: (id: string, deg: number) => void; onTiltEnd: (id: string) => void }) {
  const [g, setG] = useState<{ cx: number; cy: number; R: number } | null>(null);
  const keyRef = useRef(badge?.key);
  keyRef.current = badge?.key;
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = visibleOne(`[data-badge-id="${id}"]`) as HTMLElement | null;
      const r = el?.getBoundingClientRect();
      let next: { cx: number; cy: number; R: number } | null = null;
      if (el && r && r.width > 0) {
        // o centro não muda ao girar nem ao mudar de tamanho; o raio é o do botton no tamanho MÁXIMO (independe do tamanho atual)
        const layer = el.closest("[data-badge-layer]") as HTMLElement | null;
        const lr = layer?.getBoundingClientRect();
        const em = layer ? parseFloat(getComputedStyle(layer).fontSize) || 10 : 10;
        const sc = layer && lr && layer.offsetWidth ? lr.width / layer.offsetWidth : 1;
        const w = baseEmOf(keyRef.current ?? 0) * em * sc * (MAX_SCALE / 100);
        const h = w / ratioOfKey(keyRef.current ?? 0);
        next = { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), R: Math.round((Math.hypot(w, h) / 2) * 0.82) };
      }
      setG((p) => (p && next && p.cx === next.cx && p.cy === next.cy && p.R === next.R ? p : next));
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

  // pílula do tamanho (à direita; à esquerda se não couber)
  const W = 40;
  const TRACK = 90; // mesmo comprimento da barra de inclinação
  const Hh = 146;
  // a pílula fica longe o bastante para a barra de inclinação (centrada embaixo do botton) caber sem encostar nela
  const SW = 140;
  const off = Math.max(g.R + 8, SW / 2 + 8);
  const onRight = g.cx + off + W <= vw - 4;
  const pLeft = onRight ? g.cx + off : Math.max(4, g.cx - off - W);
  const pTop = Math.min(Math.max(g.cy - Hh / 2, 44), vh - Hh - 8);

  // barra de inclinação: pequena, centrada logo abaixo do botton; só desce para baixo da pílula se as duas se encostarem
  const SH = 50;
  const sLeft = Math.min(Math.max(g.cx - SW / 2, 4), vw - SW - 4);
  const under = g.cy + g.R + 6;
  const touchesPill = sLeft < pLeft + W && sLeft + SW > pLeft && under < pTop + Hh && under + SH > pTop;
  const lowest = touchesPill ? pTop + Hh + 6 : under;
  const sTop = lowest + SH <= vh - 8 ? lowest : Math.max(8, Math.min(g.cy - g.R, pTop) - 6 - SH);

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
          <span aria-hidden className="text-sm leading-none opacity-80" title="Anti-horário">
            ↺
          </span>
          <TouchSlider value={deg} min={-MAX_TILT} max={MAX_TILT} onChange={(v) => onTilt(id, v)} onEnd={() => onTiltEnd(id)} length={SW - 50} label="Inclinar o botton: para a esquerda gira no sentido anti-horário, para a direita no horário" />
          <span aria-hidden className="text-sm leading-none opacity-80" title="Horário">
            ↻
          </span>
        </div>
        <button
          type="button"
          aria-label="Restaurar: deixa o botton reto"
          disabled={deg === 0}
          onClick={() => {
            onTilt(id, 0);
            window.setTimeout(() => onTiltEnd(id), 0);
          }}
          className="-mt-1 cursor-pointer px-3 pt-0 pb-0.5 text-[10px] leading-none font-semibold text-[#f6c93f] disabled:cursor-default disabled:text-white/40"
        >
          Restaurar
        </button>
      </div>

      <div
        data-badge-controls
        role="toolbar"
        aria-label="Tamanho e posição do botton"
        onPointerEnter={() => onKeep(id)}
        onPointerLeave={() => onKeep(null)}
        className="fixed z-[350] flex touch-none flex-col items-center gap-0.5 rounded-full bg-[#17110c]/92 p-[3px] shadow-[0_0.3rem_1rem_rgba(0,0,0,.5)] backdrop-blur"
        style={{ left: pLeft, top: pTop, width: W, height: Hh }}
      >
        {/* tamanho: em cima maior, embaixo menor (o menor é o tamanho de sempre) */}
        <span aria-hidden className="mt-1.5 size-2.5 rounded-full bg-white/80" title="Maior" />
        <TouchSlider vertical value={scale} min={MIN_SCALE} max={MAX_SCALE} onChange={(v) => onScale(id, v)} onEnd={() => onScaleEnd(id)} length={TRACK} label="Tamanho do botton: para cima maior, para baixo menor" />
        <span aria-hidden className="size-1.5 rounded-full bg-white/80" title="Menor" />
        {isDisp && (
          <button type="button" onClick={() => onEdit(id)} aria-label="Editar o pin: contorno, horário ou cidade" title="Editar" className="mt-auto grid size-7 cursor-pointer place-items-center rounded-full text-white transition hover:bg-white/20 active:scale-90">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />
            </svg>
          </button>
        )}
        <button type="button" onClick={() => onRemove(id)} aria-label={isDisp ? "Tirar o pin do mural" : "Tirar o botton do mural (volta para a barra)"} title="Tirar do mural" className={`${isDisp ? "mb-0.5" : "mt-auto mb-0.5"} grid size-7 cursor-pointer place-items-center rounded-full text-white transition hover:bg-white/20 active:scale-90`}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />
          </svg>
        </button>
      </div>
      <button
        type="button"
        data-badge-controls
        aria-label="Fechar as opções do botton"
        title="Fechar"
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

const visibleLayer = () => visibleOne("[data-badge-layer]") as HTMLElement | null;

/**
 * Pin da loja escolhido: o mural fica escuro, o pin aparece no centro do quadro e a pessoa o arrasta para onde quiser.
 * Só vale sobre espaços livres (os espaços que o pin cobrir deixam de receber post-its, fotos e vídeos).
 */
function PlacingOverlay({ product, data, onCancel, onDrop, notify }: { product: string; data: DisplayPayload; onCancel: () => void; onDrop: (x: number, y: number, slots: number[], rect?: { left: number; right: number; top: number; bottom: number }) => void; notify: (m: string) => void }) {
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
    const w = baseEmOf(1001) * em * sc * (DISPLAY_SCALE / 100);
    setSize({ w, h: w / 2 });
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
      notify(d.kind === "occupied" ? "Esse lugar já tem um pin. Solte sobre espaços livres do mural." : d.kind === "badge" ? "Não dá para colocar um pin da loja sobre outro pin da loja." : "Solte o pin sobre o mural.");
      const lr = layerRef.current?.getBoundingClientRect();
      if (lr) setPos({ x: lr.left + lr.width / 2, y: lr.top + lr.height / 2 }); // volta ao centro
      setState("ok");
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const ring = state === "ok" ? "#6fdc8c" : "#ff8a7a";
  const cardStyle: CSSProperties = { fontSize: size.w / WIDGET_W + "px", outline: dragging ? "3px solid " + ring : "none", outlineOffset: "4px", borderRadius: "1.4em" };

  return createPortal(
    <div className="fixed inset-0 z-[380]" role="dialog" aria-label="Posicionar o pin no mural">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
      <p className="absolute top-4 left-1/2 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl bg-[#17110c]/92 px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_0.4rem_1.4rem_rgba(0,0,0,.5)]">
        Arraste o pin e solte onde você quiser no mural
      </p>
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
        Cancelar
      </button>
    </div>,
    document.body,
  );
}
