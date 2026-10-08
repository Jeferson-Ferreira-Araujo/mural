"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { addBadge, badgeDef, badgeSrc, BADGE_EM, DEFAULT_SCALE, MAX_BADGES, MAX_SCALE, MAX_TILT, MIN_SCALE, moveBadge, PHYSICAL_TYPES, removeBadge, setBadgeRotation, setBadgeScale, type PlacedBadge, type Stock } from "@/lib/badges";
import { getBrowserSupabase } from "@/lib/supabase";
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
  removeOver: (rect: { left: number; right: number; top: number; bottom: number }) => void;
};

const unlimited = (): Stock => ({ owned: true, left: 1, total: 1 }); // padrão sem loja carregada
const BadgeCtx = createContext<Ctx>({ badges: [], editable: false, draggingId: null, draggingNew: false, stock: unlimited, acquiredAt: () => undefined, openStore: () => undefined, begin: () => undefined, hover: () => undefined, select: () => undefined, removeOver: () => undefined });
export const useBadges = () => useContext(BadgeCtx);

type Drop = { kind: "ok"; x: number; y: number } | { kind: "physical" } | { kind: "badge" } | { kind: "out" } | { kind: "bar" };
type Ghost = { key: number; x: number; y: number; w: number; h: number; state: "ok" | "bad"; /** inclinação do botton já colocado: o arraste mostra o botton como ele é */ rot?: number; back?: { x: number; y: number } };

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
  const [draggingNew, setDraggingNew] = useState(false);
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
          // esgotado: só não arrasta, sem aviso; botton da loja ainda não comprado: avisa
          if (!st.owned) live.current.notify("Este botton é da loja. Libere com créditos para usar.");
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
          const w = BADGE_EM * em * scale * ((src.kind === "placed" ? (src.scale ?? DEFAULT_SCALE) : DEFAULT_SCALE) / 100);
          size = { w, h: w / (def?.ratio ?? 1) };
        }
        origin = sourceCenter();
        if (src.kind === "placed") setDraggingId(src.id);
        else setDraggingNew(true);
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
      scaleSaved.current[b.id] ??= b.scale ?? DEFAULT_SCALE;
    }
  }, [badges]);

  /** Muda o tamanho na tela enquanto a barra vertical é arrastada (ainda sem salvar). Perto da ponta de baixo, "gruda" no tamanho de sempre. */
  const rescale = useCallback((id: string, pct: number) => {
    const near = [MIN_SCALE, DEFAULT_SCALE, MAX_SCALE].find((t) => Math.abs(pct - t) <= 3); // grudinha no menor, no padrão (meio) e no maior
    const v = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(near ?? pct)));
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
  const removeOver = useCallback(
    (rect: { left: number; right: number; top: number; bottom: number }) => {
      const mine = new Set(live.current.badges.filter((b) => b.mine !== false).map((b) => b.id));
      for (const el of document.querySelectorAll<HTMLElement>("[data-badge-id]")) {
        const id = el.dataset.badgeId;
        if (!id || !mine.has(id) || !visible(el)) continue;
        const r = el.getBoundingClientRect();
        const mx = r.width * 0.1;
        const my = r.height * 0.1; // só conta se o botton cobre um pedaço de verdade
        if (r.right - mx > rect.left && r.left + mx < rect.right && r.bottom - my > rect.top && r.top + my < rect.bottom) removeById(id);
      }
    },
    [removeById],
  );
  const value = useMemo(() => ({ badges, editable, draggingId, draggingNew, stock, acquiredAt, openStore: () => openStoreRef.current(), begin, hover, select, removeOver }), [badges, editable, draggingId, draggingNew, stock, acquiredAt, begin, hover, select, removeOver]);
  const controlsId = editable && !draggingId ? (selId ?? hoverId) : null;

  return (
    <BadgeCtx.Provider value={value}>
      {children}
      {controlsId && <BadgeControls id={controlsId} badge={badges.find((b) => b.id === controlsId)} onScale={rescale} onScaleEnd={commitScale} onRemove={removeById} onKeep={hover} onClose={closeControls} onTilt={tilt} onTiltEnd={commitTilt} />}
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
function BadgeControls({ id, badge, onScale, onScaleEnd, onRemove, onKeep, onClose, onTilt, onTiltEnd }: { id: string; badge?: PlacedBadge; onScale: (id: string, pct: number) => void; onScaleEnd: (id: string) => void; onRemove: (id: string) => void; onKeep: (id: string | null) => void; onClose: () => void; onTilt: (id: string, deg: number) => void; onTiltEnd: (id: string) => void }) {
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
        const w = BADGE_EM * em * sc * (MAX_SCALE / 100);
        const h = w / (badgeDef(keyRef.current ?? 0)?.ratio ?? 1);
        next = { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), R: Math.round((Math.hypot(w, h) / 2) * 0.82) };
      }
      setG((p) => (p && next && p.cx === next.cx && p.cy === next.cy && p.R === next.R ? p : next));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [id]);
  if (!g || !badge || typeof document === "undefined") return null;

  const scale = badge.scale ?? DEFAULT_SCALE;
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
        <button type="button" onClick={() => onRemove(id)} aria-label="Tirar o botton do mural (volta para a barra)" title="Tirar do mural" className="mt-auto mb-0.5 grid size-7 cursor-pointer place-items-center rounded-full text-white transition hover:bg-white/20 active:scale-90">
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
