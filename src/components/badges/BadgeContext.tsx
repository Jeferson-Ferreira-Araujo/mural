"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { addBadge, badgeDef, badgeSrc, BADGE_EM, DEFAULT_SCALE, MAX_BADGES, MAX_SCALE, MAX_TILT, MIN_SCALE, moveBadge, PHYSICAL_TYPES, removeBadge, setBadgeRotation, setBadgeScale, type PlacedBadge, type Stock } from "@/lib/badges";
import { getBrowserSupabase } from "@/lib/supabase";

export type DragSrc = { kind: "new"; key: number } | { kind: "placed"; id: string; key: number; /** tamanho em % do botton que está sendo arrastado */ scale?: number };

type Ctx = {
  badges: PlacedBadge[];
  /** só o dono, no próprio mural */
  editable: boolean;
  /** botom que está sendo arrastado (some do lugar de origem até soltar) */
  draggingId: string | null;
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
};

const unlimited = (): Stock => ({ owned: true, left: 1, total: 1 }); // padrão sem loja carregada
const BadgeCtx = createContext<Ctx>({ badges: [], editable: false, draggingId: null, stock: unlimited, acquiredAt: () => undefined, openStore: () => undefined, begin: () => undefined, hover: () => undefined, select: () => undefined });
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
  acquiredAt = () => undefined,
  onSynced,
  onOpenStore = () => undefined,
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
  children: ReactNode;
}) {
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const live = useRef({ muralId, editable, badges, notify, stock, onSynced });
  live.current = { muralId, editable, badges, notify, stock, onSynced };
  const cleanup = useRef<(() => void) | null>(null);

  const begin = useCallback(
    (e: PointerEvent, src: DragSrc, sourceEl: HTMLElement) => {
      if (!live.current.editable || e.button > 0) return;
      if (src.kind === "new") {
        const st = live.current.stock(src.key);
        if (!st.owned || st.left === 0) {
          live.current.notify(st.owned ? "Esgotado: você já colocou a unidade deste botton. Compre mais na loja." : "Este botton é da loja. Libere com créditos para usar.");
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
          const w = BADGE_EM * em * scale * (src.kind === "placed" ? (src.scale ?? 100) / 100 : 1);
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
        setGhost(null);
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
        setBadges((l) => [...l, { id: tmp, key: src.key, x: drop.x, y: drop.y }]);
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
    const v = Math.max(-MAX_TILT, Math.min(MAX_TILT, Math.round(deg)));
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
      scaleSaved.current[b.id] ??= b.scale ?? DEFAULT_SCALE;
    }
  }, [badges]);

  /** Muda o tamanho na tela enquanto a barra vertical é arrastada (ainda sem salvar). Perto do meio, "gruda" no tamanho padrão. */
  const rescale = useCallback((id: string, pct: number) => {
    const snapped = Math.abs(pct - DEFAULT_SCALE) <= 4 ? DEFAULT_SCALE : pct;
    const v = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(snapped)));
    setBadges((l) => l.map((x) => (x.id === id ? { ...x, scale: v } : x)));
  }, [setBadges]);
  const scaleSaved = useRef<Record<string, number>>({});
  /** Ao soltar a barra: se ficou maior, tem que caber no lugar; grava o tamanho (se falhar, volta ao anterior). */
  const commitScale = useCallback((id: string) => {
    const { badges: cur, notify } = live.current;
    const b = cur.find((x) => x.id === id);
    if (!b || id.startsWith("tmp-")) return;
    const before = scaleSaved.current[id] ?? DEFAULT_SCALE;
    const pct = b.scale ?? DEFAULT_SCALE;
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
        const w = (BADGE_EM * em * sc * pct) / 100;
        const h = w / (badgeDef(b.key)?.ratio ?? 1);
        const drop = evaluate(r.left + r.width / 2, r.top + r.height / 2, w, h, layer, el);
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

  const openStoreRef = useRef(onOpenStore);
  openStoreRef.current = onOpenStore;
  const value = useMemo(() => ({ badges, editable, draggingId, stock, acquiredAt, openStore: () => openStoreRef.current(), begin, hover, select }), [badges, editable, draggingId, stock, acquiredAt, begin, hover, select]);
  const controlsId = editable && !draggingId ? (selId ?? hoverId) : null;

  return (
    <BadgeCtx.Provider value={value}>
      {children}
      {controlsId && <BadgeControls id={controlsId} badge={badges.find((b) => b.id === controlsId)} onScale={rescale} onScaleEnd={commitScale} onRemove={removeById} onKeep={hover} onTilt={tilt} onTiltEnd={commitTilt} />}
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

/**
 * Controles do botton (+, −, lixeira): uma pílula de tamanho fixo ao lado dele, por cima do mural (não encolhe com o zoom do celular).
 * Segue o botton enquanto o quadro é arrastado ou ampliado.
 */
function BadgeControls({ id, badge, onScale, onScaleEnd, onRemove, onKeep, onTilt, onTiltEnd }: { id: string; badge?: PlacedBadge; onScale: (id: string, pct: number) => void; onScaleEnd: (id: string) => void; onRemove: (id: string) => void; onKeep: (id: string | null) => void; onTilt: (id: string, deg: number) => void; onTiltEnd: (id: string) => void }) {
  const [box, setBox] = useState<{ l: number; t: number; r: number; b: number } | null>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = visibleOne(`[data-badge-id="${id}"]`) as HTMLElement | null;
      const r = el?.getBoundingClientRect();
      let next: { l: number; t: number; r: number; b: number } | null = null;
      if (el && r && r.width > 0) {
        // o centro não muda ao girar; o tamanho é o do botton reto (offsetWidth ignora a rotação) na escala do quadro
        const layer = el.closest("[data-badge-layer]") as HTMLElement | null;
        const lr = layer?.getBoundingClientRect();
        const sc = layer && lr && layer.offsetWidth ? lr.width / layer.offsetWidth : 1;
        const w = el.offsetWidth * sc;
        const h = el.offsetHeight * sc;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        next = { l: Math.round(cx - w / 2), t: Math.round(cy - h / 2), r: Math.round(cx + w / 2), b: Math.round(cy + h / 2) };
      }
      setBox((p) => (p && next && p.l === next.l && p.t === next.t && p.r === next.r && p.b === next.b ? p : next));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [id]);
  if (!box || !badge || typeof document === "undefined") return null;

  const scale = badge.scale ?? DEFAULT_SCALE;
  const W = 32;
  const Hh = 128;
  const left = box.r + 8 + W > window.innerWidth ? box.l - 8 - W : box.r + 8;
  const top = Math.min(Math.max((box.t + box.b) / 2 - Hh / 2, 8), window.innerHeight - Hh - 8);
  const btn = "grid size-[1.65rem] cursor-pointer place-items-center rounded-full text-base leading-none font-bold text-white transition hover:bg-white/20 active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

  const deg = badge.rotation ?? 0;
  const SW = 138;
  const SH = 36;
  const sLeft = Math.min(Math.max((box.l + box.r) / 2 - SW / 2, 8), window.innerWidth - SW - 8);
  // a barra fica abaixo do botton E abaixo da pílula (+, −, lixeira), sem sobrepor; sem espaço embaixo, vai para cima dos dois
  const lowest = Math.max(box.b + 10, top + Hh + 6);
  const sTop = lowest + SH <= window.innerHeight - 8 ? lowest : Math.max(8, Math.min(box.t, top) - 6 - SH);

  return createPortal(
    <>
    <div
      data-badge-controls
      onPointerEnter={() => onKeep(id)}
      onPointerLeave={() => onKeep(null)}
      className="fixed z-[350] flex flex-col items-center rounded-xl bg-[#17110c]/90 px-2 pt-0.5 pb-0.5 text-white shadow-[0_0.3rem_1rem_rgba(0,0,0,.5)] backdrop-blur"
      style={{ left: sLeft, top: sTop, width: SW }}
    >
      <div className="flex w-full items-center gap-1.5">
        <span aria-hidden className="text-sm leading-none opacity-80" title="Anti-horário">
          ↺
        </span>
        <input
          type="range"
          min={-MAX_TILT}
          max={MAX_TILT}
          step={1}
          value={deg}
          onChange={(e) => onTilt(id, Number(e.target.value))}
          onPointerUp={() => onTiltEnd(id)}
          onKeyUp={() => onTiltEnd(id)}
          onBlur={() => onTiltEnd(id)}
          aria-label="Inclinar o botton: para a esquerda gira no sentido anti-horário, para a direita no horário"
          className="h-5 min-w-0 flex-1 cursor-pointer accent-[#f6c93f]"
        />
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
        className="-mt-0.5 cursor-pointer text-[10px] leading-none font-semibold text-[#f6c93f] disabled:cursor-default disabled:text-white/40"
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
      className="fixed z-[350] flex flex-col items-center gap-px rounded-full bg-[#17110c]/90 p-[3px] shadow-[0_0.3rem_1rem_rgba(0,0,0,.5)] backdrop-blur"
      style={{ left, top, width: W }}
    >
      {/* tamanho: barra vertical (em cima maior, embaixo menor; o meio é o tamanho padrão) */}
      <span aria-hidden className="mt-0.5 size-2.5 rounded-full bg-white/80" title="Maior" />
      <div className="relative h-[68px] w-6">
        <input
          type="range"
          min={MIN_SCALE}
          max={MAX_SCALE}
          step={1}
          value={scale}
          onChange={(e) => onScale(id, Number(e.target.value))}
          onPointerUp={() => onScaleEnd(id)}
          onKeyUp={() => onScaleEnd(id)}
          onBlur={() => onScaleEnd(id)}
          aria-label="Tamanho do botton: para cima maior, para baixo menor"
          aria-orientation="vertical"
          className="absolute top-1/2 left-1/2 h-6 w-[68px] -translate-x-1/2 -translate-y-1/2 -rotate-90 cursor-pointer accent-[#f6c93f]"
        />
      </div>
      <span aria-hidden className="mb-0.5 size-1.5 rounded-full bg-white/80" title="Menor" />
      <button type="button" onClick={() => onRemove(id)} aria-label="Tirar o botton do mural (volta para a barra)" title="Tirar do mural" className={btn}>
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />
        </svg>
      </button>
    </div>
    </>,
    document.body,
  );
}
