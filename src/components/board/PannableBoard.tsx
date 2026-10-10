"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** O "mundo" do quadro (proporção 3:2 da imagem). O conteúdo é desenhado nesse tamanho e depois movido/ampliado por transform. */
export const WORLD_W = 1200;
export const WORLD_H = 800;

const DRAG_PX = 6; // abaixo disso é toque, não arrasto
const DOUBLE_TAP_MS = 300;
const CLICK_DELAY_MS = 280; // espera para saber se é toque simples ou o primeiro de um toque duplo

/**
 * Quadro navegável (celular): arrastar com o dedo (ou mouse), pinça para ampliar, toque duplo amplia onde tocou,
 * e um botão alterna entre "ver o mural inteiro" e aproximar. O conteúdo (filhos) tem WORLD_W × WORLD_H.
 * Os cliques dos filhos (tocar num pin ou num espaço livre) continuam funcionando, só atrasados ~0,3 s para distinguir do toque duplo.
 */
export function PannableBoard({ children, ambient, cornerLeft, controlPos = "right-3 bottom-3", hideControls = false }: { children: ReactNode; /** sem o botão Aproximar/Afastar (ex.: mural privado ainda trancado) */ hideControls?: boolean; /** posição do botão Aproximar/Afastar (classes de posição) */ controlPos?: string; /** imagem borrada de fundo (as bordas quando o quadro inteiro cabe) */ ambient?: string; /** botão fixo no canto inferior esquerdo (na mesma linha do Aproximar/Afastar) */ cornerLeft?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const view = useRef({ x: 0, y: 0, s: 1 });
  const size = useRef({ w: 0, h: 0 });
  const ready = useRef(false);
  const zoomedOutRef = useRef(false);
  const [zoomedOut, setZoomedOut] = useState(false);

  // gesto em andamento
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pan = useRef({ px: 0, py: 0, vx: 0, vy: 0 });
  const pinch = useRef({ d: 1, s: 1 });
  const dragged = useRef(false);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const swallowClick = useRef(false);
  const bypassClick = useRef(false);
  const pending = useRef<{ timer: number; target: HTMLElement } | null>(null);
  const lastType = useRef("touch"); // mouse: o clique é imediato e não existe toque duplo

  const limits = useCallback(() => {
    const { w, h } = size.current;
    const minS = Math.min(w / WORLD_W, h / WORLD_H);
    // o máximo é o mesmo tanto que o botão "Aproximar" amplia (~0,6 cartão por tela): mais que isso não deixa
    // celular: ~0,6 cartão por tela; telas largas (desktop): ~1,25 cartão, senão a ampliação fica enorme
    const perScreen = w >= 700 ? 1.25 : 0.6;
    const defS = Math.max(minS, w / (130 * perScreen));
    const maxS = Math.max(minS * 1.001, defS);
    return { minS, maxS, defS };
  }, []);

  const clampView = useCallback(
    (x: number, y: number, s: number) => {
      const { w, h } = size.current;
      const { minS, maxS } = limits();
      const ss = Math.min(maxS, Math.max(minS, s));
      const sw = WORLD_W * ss;
      const sh = WORLD_H * ss;
      const cx = sw <= w ? (w - sw) / 2 : Math.min(0, Math.max(w - sw, x));
      const cy = sh <= h ? (h - sh) / 2 : Math.min(0, Math.max(h - sh, y));
      return { x: cx, y: cy, s: ss };
    },
    [limits],
  );

  const promoteTimer = useRef<number | null>(null);
  const zoomingTimer = useRef<number | null>(null);
  const rafId = useRef(0);
  const boxRect = useRef<DOMRect | null>(null);
  const apply = useCallback(
    (animate = false) => {
      const el = world.current;
      if (!el) return;
      const { x, y, s } = view.current;
      el.style.transition = animate ? "transform .24s cubic-bezier(.2,.8,.2,1)" : "none";
      // durante a animação as sombras e filtros saem (são o que mais pesa com dezenas de pins na tela): zoom sem travar
      if (animate) {
        el.classList.add("zooming");
        if (zoomingTimer.current) window.clearTimeout(zoomingTimer.current);
        zoomingTimer.current = window.setTimeout(() => world.current?.classList.remove("zooming"), 320);
      }
      el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
      // durante o gesto o quadro vira uma camada da GPU (mover não repinta os cartões); depois solta, e o navegador redesenha nítido
      el.style.willChange = "transform";
      if (promoteTimer.current) window.clearTimeout(promoteTimer.current);
      const out = s <= limits().minS * 1.02;
      // com o mural inteiro à vista a camada fica como está: soltá-la fazia o navegador redesenhar tudo de uma vez (a "piscada" ao afastar)
      promoteTimer.current = out
        ? null
        : window.setTimeout(() => {
            if (world.current) world.current.style.willChange = "";
          }, animate ? 360 : 240);
      if (out !== zoomedOutRef.current) {
        zoomedOutRef.current = out;
        setZoomedOut(out);
      }
    },
    [limits],
  );

  /** Agrupa os movimentos do dedo: no máximo um desenho por quadro da tela. */
  const scheduleApply = useCallback(() => {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = 0;
      apply(false);
    });
  }, [apply]);

  /** Muda a ampliação mantendo o ponto (cx, cy) da tela no mesmo lugar do quadro. */
  const zoomTo = useCallback(
    (wanted: number, cx: number, cy: number, animate: boolean) => {
      const { x, y, s } = view.current;
      // o tamanho é limitado ANTES de calcular a posição: pedir mais que o máximo (ou menos que o mínimo) não pode deslocar o quadro
      const { minS, maxS } = limits();
      const newS = Math.min(maxS, Math.max(minS, wanted));
      const wx = (cx - x) / s;
      const wy = (cy - y) / s;
      view.current = clampView(cx - wx * newS, cy - wy * newS, newS);
      if (animate) apply(true);
      else scheduleApply();
    },
    [apply, clampView, scheduleApply, limits],
  );

  // mede a área e, na primeira vez, mostra o mural inteiro
  useLayoutEffect(() => {
    const b = box.current;
    if (!b) return;
    const measure = () => {
      const r = b.getBoundingClientRect();
      size.current = { w: r.width, h: r.height };
      if (!ready.current && r.width > 0) {
        ready.current = true;
        // começa mostrando o mural inteiro (o botão "Aproximar", a pinça e o toque duplo ampliam)
        const { minS } = limits();
        view.current = clampView((r.width - WORLD_W * minS) / 2, (r.height - WORLD_H * minS) / 2, minS);
      } else {
        const { x, y, s } = view.current;
        view.current = clampView(x, y, s);
      }
      apply(false);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(b);
    return () => ro.disconnect();
  }, [apply, clampView, limits]);

  // roda do mouse amplia (útil em tablets e testes no computador)
  useEffect(() => {
    const b = box.current;
    if (!b) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = b.getBoundingClientRect();
      zoomTo(view.current.s * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top, false);
    };
    b.addEventListener("wheel", onWheel, { passive: false });
    return () => b.removeEventListener("wheel", onWheel);
  }, [zoomTo]);

  const rel = useCallback((e: PointerEvent | React.PointerEvent, fresh = false) => {
    if (fresh || !boxRect.current) boxRect.current = box.current!.getBoundingClientRect();
    const r = boxRect.current;
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const doubleTapZoom = useCallback(
    (cx: number, cy: number) => {
      const { maxS, defS, minS } = limits();
      const s = view.current.s;
      // perto do máximo: volta ao padrão; senão, amplia onde tocou
      const target = s >= maxS * 0.85 ? (s > defS * 1.05 ? defS : minS) : Math.min(maxS, Math.max(s * 2.2, defS * 1.8));
      zoomTo(target, cx, cy, true);
    },
    [limits, zoomTo],
  );

  const onMove = useCallback(
    (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      if (document.body.classList.contains("pin-dragging") || document.body.classList.contains("badge-dragging")) return; // arrastando um pin, botton ou widget: o quadro fica parado
      const p = rel(e);
      pointers.current.set(e.pointerId, p);
      if (pointers.current.size >= 2) {
        const [a, b] = [...pointers.current.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        zoomTo(pinch.current.s * (d / pinch.current.d), (a.x + b.x) / 2, (a.y + b.y) / 2, false);
        return;
      }
      const dx = p.x - pan.current.px;
      const dy = p.y - pan.current.py;
      if (!dragged.current && Math.hypot(dx, dy) > DRAG_PX) dragged.current = true;
      if (dragged.current) {
        view.current = clampView(pan.current.vx + dx, pan.current.vy + dy, view.current.s);
        scheduleApply();
      }
    },
    [scheduleApply, clampView, rel, zoomTo],
  );

  const onUp = useCallback(
    (e: PointerEvent) => {
      const had = pointers.current.get(e.pointerId);
      pointers.current.delete(e.pointerId);
      if (!had) return;
      if (pointers.current.size === 1) {
        // sobrou um dedo depois da pinça: continua arrastando a partir dele
        const [p] = [...pointers.current.values()];
        pan.current = { px: p.x, py: p.y, vx: view.current.x, vy: view.current.y };
        dragged.current = true;
        return;
      }
      if (pointers.current.size > 0) return;
      if (e.type !== "pointercancel" && !dragged.current && e.pointerType !== "mouse") {
        // toque: dois seguidos e perto um do outro = ampliar onde tocou
        const now = performance.now();
        const lt = lastTap.current;
        if (lt && now - lt.t < DOUBLE_TAP_MS && Math.hypot(had.x - lt.x, had.y - lt.y) < 36) {
          lastTap.current = null;
          if (pending.current) {
            window.clearTimeout(pending.current.timer);
            pending.current = null;
          }
          swallowClick.current = true; // o clique do segundo toque não faz nada
          doubleTapZoom(had.x, had.y);
        } else {
          lastTap.current = { t: now, x: had.x, y: had.y };
        }
      }
      window.setTimeout(() => (dragged.current = false), 60);
    },
    [doubleTapZoom],
  );

  // um item recém-colocado fora da tela: o quadro desliza até ele
  useEffect(() => {
    const h = (e: Event) => {
      const el = (e as CustomEvent<HTMLElement>).detail;
      const b = box.current;
      if (!el || !b || !b.contains(el)) return;
      const r = el.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const m = 60;
      if (r.left > br.left + m && r.right < br.right - m && r.top > br.top + m && r.bottom < br.bottom - m) return; // já está à vista
      const dx = br.left + br.width / 2 - (r.left + r.width / 2);
      const dy = br.top + br.height / 2 - (r.top + r.height / 2);
      view.current = clampView(view.current.x + dx, view.current.y + dy, view.current.s);
      apply(true);
    };
    window.addEventListener("pinz:focus", h);
    return () => window.removeEventListener("pinz:focus", h);
  }, [apply, clampView]);

  // ouvintes de janela registrados uma vez (o movimento continua valendo mesmo se o dedo sair do quadro)
  useEffect(() => {
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [onMove, onUp]);

  // janelas (detalhe do pin, avisos…) são filhas do quadro no DOM, mas não fazem parte dele: nada de arrastar nem de adiar o clique delas
  const inDialog = (t: EventTarget | null) => t instanceof Element && !!t.closest("dialog, [data-zoom-controls]"); // os botões + e − também não participam do arrastar nem do adiamento do clique

  const onPointerDown = (e: React.PointerEvent) => {
    if (inDialog(e.target)) return;
    lastType.current = e.pointerType;
    // mouse sobre um pin que o dono pode arrastar: quem cuida disso é o próprio pin, o quadro não começa a mover
    if (e.pointerType === "mouse" && e.target instanceof Element && e.target.closest("[data-pin-drag]")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const p = rel(e, true); // lê o retângulo uma vez, no começo do toque
    pointers.current.set(e.pointerId, p);
    if (world.current) world.current.style.transition = "none";
    if (pointers.current.size === 1) {
      pan.current = { px: p.x, py: p.y, vx: view.current.x, vy: view.current.y };
      dragged.current = false;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: view.current.s };
      dragged.current = true; // com dois dedos nunca é toque
    }
  };

  // cliques dos filhos: ignorados depois de arrastar, adiados até saber se vem um segundo toque
  const onClickCapture = (e: React.MouseEvent) => {
    if (inDialog(e.target)) return;
    if (lastType.current === "mouse") {
      // mouse: depois de arrastar o quadro o clique não vale; fora isso passa direto, sem o atraso do toque duplo
      if (dragged.current) {
        e.stopPropagation();
        e.preventDefault();
      }
      return;
    }
    if (bypassClick.current) {
      bypassClick.current = false;
      return;
    }
    if (swallowClick.current) {
      swallowClick.current = false;
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (dragged.current) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    if (pending.current) window.clearTimeout(pending.current.timer);
    const target = e.target as HTMLElement;
    pending.current = {
      target,
      timer: window.setTimeout(() => {
        pending.current = null;
        bypassClick.current = true;
        target.click();
        bypassClick.current = false;
      }, CLICK_DELAY_MS),
    };
  };

  function toggleZoom() {
    const { w, h } = size.current;
    const { minS, defS } = limits();
    const cx = w / 2;
    const cy = h / 2;
    zoomTo(zoomedOutRef.current ? defS : minS, cx, cy, true);
  }

  return (
    <div
      ref={box}
      onPointerDown={onPointerDown}
      onClickCapture={onClickCapture}
      className="relative size-full touch-none overflow-hidden bg-[#3b2616] select-none"
      style={{ touchAction: "none" }}
    >
      {ambient && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ambient} alt="" aria-hidden draggable={false} className="pointer-events-none absolute inset-0 size-full scale-110 object-cover opacity-80 blur-2xl" />
      )}
      <div ref={world} className="absolute top-0 left-0 origin-top-left [container-type:size]" style={{ width: WORLD_W, height: WORLD_H }}>
        {children}
      </div>

      {cornerLeft && (
        <div onPointerDown={(e) => e.stopPropagation()} className="absolute bottom-3 left-3 z-20">
          {cornerLeft}
        </div>
      )}

      {!hideControls && (
        <button
          type="button"
          data-zoom-controls
          onPointerDown={(e) => e.stopPropagation()}
          onClick={toggleZoom}
          aria-label={zoomedOut ? "Aproximar o mural" : "Afastar o mural"}
          title={zoomedOut ? "Aproximar" : "Afastar"}
          className={`absolute ${controlPos} z-20 inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#17110c]/85 px-4 text-sm font-semibold text-white shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]`}
        >
          <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {/* lupa: "+" para aproximar, "−" para ver tudo */}
            <circle cx="11" cy="11" r="6.5" />
            <path d="m20 20-4.2-4.2" />
            {zoomedOut ? <path d="M11 8v6M8 11h6" /> : <path d="M8 11h6" />}
          </svg>
          {zoomedOut ? "Aproximar" : "Afastar"}
        </button>
      )}
    </div>
  );
}
