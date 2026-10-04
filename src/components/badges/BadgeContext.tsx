"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addBadge, badgeDef, badgeSrc, BADGE_EM, MAX_BADGES, moveBadge, PHYSICAL_TYPES, removeBadge, type PlacedBadge, type Stock } from "@/lib/badges";
import { getBrowserSupabase } from "@/lib/supabase";

export type DragSrc = { kind: "new"; key: number } | { kind: "placed"; id: string; key: number };

type Ctx = {
  badges: PlacedBadge[];
  /** só o dono, no próprio mural */
  editable: boolean;
  /** botom que está sendo arrastado (some do lugar de origem até soltar) */
  draggingId: string | null;
  /** unidades que a pessoa ainda pode colocar de cada pin (FREE: 1 por pin; PLUS: ilimitado) */
  stock: (key: number) => Stock;
  openStore: () => void;
  begin: (e: PointerEvent, src: DragSrc, sourceEl: HTMLElement) => void;
};

const unlimited = (): Stock => ({ owned: true, left: null, total: null });
const BadgeCtx = createContext<Ctx>({ badges: [], editable: false, draggingId: null, stock: unlimited, openStore: () => undefined, begin: () => undefined });
export const useBadges = () => useContext(BadgeCtx);

type Drop = { kind: "ok"; x: number; y: number } | { kind: "physical" } | { kind: "badge" } | { kind: "out" } | { kind: "bar" };
type Ghost = { key: number; x: number; y: number; w: number; h: number; state: "ok" | "bad"; back?: { x: number; y: number } };

const visible = (el: Element | null) => !!el && el.getBoundingClientRect().width > 0 && (el as HTMLElement).offsetParent !== null;
const visibleOne = (sel: string) => [...document.querySelectorAll(sel)].find(visible) ?? null;
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), Math.max(a, b));

/** Onde o botom cai se for solto em (px, py)? Respeita o quadro, os pinz físicos e as tachinhas. */
function evaluate(px: number, py: number, w: number, h: number, layer: Element, ignore?: Element): Drop {
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
  onOpenStore = () => undefined,
  children,
}: {
  muralId?: string;
  editable: boolean;
  badges: PlacedBadge[];
  setBadges: (fn: (prev: PlacedBadge[]) => PlacedBadge[]) => void;
  notify: (msg: string) => void;
  stock?: (key: number) => Stock;
  onOpenStore?: () => void;
  children: ReactNode;
}) {
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const live = useRef({ muralId, editable, badges, notify, stock });
  live.current = { muralId, editable, badges, notify, stock };
  const cleanup = useRef<(() => void) | null>(null);

  const begin = useCallback(
    (e: PointerEvent, src: DragSrc, sourceEl: HTMLElement) => {
      if (!live.current.editable || e.button > 0) return;
      if (src.kind === "new") {
        const st = live.current.stock(src.key);
        if (!st.owned || st.left === 0) {
          live.current.notify(st.owned ? "Esgotado: você já colocou a unidade deste pin. Compre mais na loja." : "Este pin é da loja. Libere com créditos para usar.");
          return;
        }
      }
      cleanup.current?.();
      const start = { x: e.clientX, y: e.clientY };
      const touch = e.pointerType !== "mouse";
      const def = badgeDef(src.key);
      let active = false;
      let size = { w: 56, h: 56 };
      let layer: Element | null = null;
      let origin: { x: number; y: number } | null = null; // para onde voltar se não puder soltar

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
          const w = BADGE_EM * em * scale;
          size = { w, h: w / (def?.ratio ?? 1) };
        }
        origin = sourceCenter();
        if (src.kind === "placed") setDraggingId(src.id);
        document.body.classList.add("badge-dragging");
      };
      const stateAt = (x: number, y: number): "ok" | "bad" => {
        if (!layer) return "bad";
        const d = evaluate(x, y, size.w, size.h, layer, sourceEl);
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
        setGhost({ key: src.key, x: ev.clientX, y: ev.clientY, w: size.w, h: size.h, state: stateAt(ev.clientX, ev.clientY) });
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
        setGhost({ key: src.key, x: at.x, y: at.y, w: size.w, h: size.h, state: "bad", back: to });
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
        if (!active) return;
        const { notify, muralId: mid, badges: cur } = live.current;
        const at = ev ? { x: ev.clientX, y: ev.clientY } : (origin ?? { x: 0, y: 0 });
        if (aborted || !layer) return sendBack(at);
        const drop = evaluate(at.x, at.y, size.w, size.h, layer, sourceEl);

        if (drop.kind === "bar") {
          if (src.kind === "placed") {
            setGhost(null);
            const prev = cur;
            setBadges((l) => l.filter((b) => b.id !== src.id));
            void removeBadge(getBrowserSupabase(), src.id).then((ok) => {
              if (!ok) {
                setBadges(() => prev);
                notify("Não foi possível tirar o pin agora.");
              }
            });
          } else sendBack(at);
          return;
        }
        if (drop.kind === "physical") {
          notify('Não dá para colocar sobre pinz "físicos".');
          return sendBack(at);
        }
        if (drop.kind === "badge") {
          notify("Não dá para colocar um pin sobre outro pin.");
          return sendBack(at);
        }
        if (drop.kind === "out") {
          notify("Solte o pin sobre o mural.");
          return sendBack(at);
        }
        setGhost(null);
        if (src.kind === "placed") {
          setBadges((l) => l.map((b) => (b.id === src.id ? { ...b, x: drop.x, y: drop.y } : b)));
          void moveBadge(getBrowserSupabase(), src.id, drop.x, drop.y).then((ok) => {
            if (!ok) notify("Não foi possível mover o pin agora.");
          });
          return;
        }
        if (!mid) return;
        if (cur.length >= MAX_BADGES) {
          notify(`O mural aceita até ${MAX_BADGES} pins decorativos.`);
          return sendBack(at);
        }
        const tmp = `tmp-${Date.now()}`;
        setBadges((l) => [...l, { id: tmp, key: src.key, x: drop.x, y: drop.y }]);
        void addBadge(getBrowserSupabase(), mid, src.key, drop.x, drop.y).then((res) => {
          if ("error" in res) {
            setBadges((l) => l.filter((b) => b.id !== tmp));
            notify(res.error === "sold_out" ? "Esgotado: compre mais unidades deste pin na loja." : res.error === "not_owned" ? "Este pin é da loja. Libere com créditos para usar." : "Não foi possível colocar o pin agora.");
          } else setBadges((l) => l.map((b) => (b.id === tmp ? { ...b, id: res.id } : b)));
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

  const openStoreRef = useRef(onOpenStore);
  openStoreRef.current = onOpenStore;
  const value = useMemo(() => ({ badges, editable, draggingId, stock, openStore: () => openStoreRef.current(), begin }), [badges, editable, draggingId, stock, begin]);

  return (
    <BadgeCtx.Provider value={value}>
      {children}
      {ghost && (
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
            transform: ghost.back ? "scale(0.8)" : "scale(1.12) rotate(-6deg)",
            filter: `drop-shadow(0 6px 8px rgba(0,0,0,.45))${ghost.state === "bad" && !ghost.back ? " grayscale(0.6)" : ""}`,
          }}
        />
      )}
    </BadgeCtx.Provider>
  );
}
