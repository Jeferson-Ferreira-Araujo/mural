"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** O "mundo" do quadro (proporção 3:2 da imagem). O conteúdo é desenhado nesse tamanho e depois movido/ampliado por transform. */
export const WORLD_W = 1200;
export const WORLD_H = 800;
/** Duração do zoom dos botões Aproximar/Afastar (ms): mais longa e com entrada e saída suaves, para o movimento ficar fluido. */
const ZOOM_MS = 460;

const DRAG_PX = 6; // abaixo disso é toque, não arrasto
const DOUBLE_TAP_MS = 300;
const SWIPE_PX = 90; // arrastar tanto além da borda lateral troca de mural
const CLICK_DELAY_MS = 280; // espera para saber se é toque simples ou o primeiro de um toque duplo

/**
 * Quadro navegável (celular): arrastar com o dedo (ou mouse), pinça para ampliar, toque duplo amplia onde tocou,
 * e um botão alterna entre "ver o mural inteiro" e aproximar. O conteúdo (filhos) tem WORLD_W × WORLD_H.
 * Os cliques dos filhos (tocar num pin ou num espaço livre) continuam funcionando, só atrasados ~0,3 s para distinguir do toque duplo.
 */
export function PannableBoard({ children, ambient, cornerLeft, controlPos = "right-3 bottom-3", hideControls = false, onSwipe, bare = false, wideZoom = 1.25, startZoomed = false }: { /** celular: já abre com o mural ampliado, no centro (em vez de afastado, inteiro) */ startZoomed?: boolean; /** quantos cartões cabem na largura da tela ao aproximar, em telas largas (maior = aproximar menos) */ wideZoom?: number; children: ReactNode; /** sem o fundo marrom próprio: o fundo da tela aparece por trás (tela inicial do celular) */ bare?: boolean; /** arrastar para o lado, além da borda do quadro, passa para o outro mural (1 = próximo, -1 = anterior); uma troca por arrastada: para trocar de novo é preciso soltar e arrastar outra vez */ onSwipe?: (dir: 1 | -1) => void; /** sem o botão Aproximar/Afastar (ex.: mural privado ainda trancado) */ hideControls?: boolean; /** posição do botão Aproximar/Afastar (classes de posição) */ controlPos?: string; /** imagem borrada de fundo (as bordas quando o quadro inteiro cabe) */ ambient?: string; /** botão fixo no canto inferior esquerdo (na mesma linha do Aproximar/Afastar) */ cornerLeft?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const swipeRef = useRef(onSwipe);
  const touched = useRef(false); // a pessoa já mexeu no quadro (zoom ou arraste): o zoom inicial não se repete
  const startZoomedRef = useRef(startZoomed);
  startZoomedRef.current = startZoomed;
  const wideRef = useRef(wideZoom);
  wideRef.current = wideZoom;
  const swiped = useRef(false); // já trocou de mural nesta arrastada
  swipeRef.current = onSwipe;
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
    // o máximo é o mesmo tanto que o botão "Aproximar" amplia: mais que isso não deixa
    // celular: ~2 cartões (de 130) por largura de tela, o post-it ocupa cerca de 48% da largura (37% foi o aprovado em 11/out; 3× mais travava ao afastar; o dono pediu "um pouco mais");
    // telas largas (desktop): ~1,25 cartão, senão a ampliação fica enorme
    const perScreen = w >= 700 ? wideRef.current : 1.6;
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
  const lastS = useRef(0);
  const outRaf = useRef(0);
  const apply = useCallback(
    (animate = false, ms = ZOOM_MS) => {
      const el = world.current;
      if (!el) return;
      const { x, y, s } = view.current;
      const prevS = lastS.current;
      lastS.current = s;
      // afastar (a escala diminui muito): a camada é preparada um quadro ANTES de a animação começar, para o custo de montá-la não cair no meio do movimento
      const zoomOut = animate && prevS > 0 && s < prevS * 0.97;
      if (outRaf.current) {
        window.clearTimeout(outRaf.current);
        outRaf.current = 0;
      }
      el.style.transition = animate ? `transform ${ms}ms cubic-bezier(.45,.05,.2,1)` : "none";
      // durante a animação as sombras e filtros saem (são o que mais pesa com dezenas de pins na tela): zoom sem travar
      if (animate) {
        el.classList.add("zooming");
        if (zoomingTimer.current) window.clearTimeout(zoomingTimer.current);
        zoomingTimer.current = window.setTimeout(() => {
          const w = world.current;
          if (!w) return;
          if (zoomOut) {
            // fim do afastar: o quadro pequeno é redesenhado já na escala pequena (a camada guardava a escala grande do começo, e redesenhar tudo nela travava);
            // solta a camada por um quadro e a prende de novo
            w.classList.remove("zooming");
            w.style.willChange = "";
            window.setTimeout(() => {
              if (world.current) world.current.style.willChange = "transform";
            }, 34);
          } else w.classList.remove("zooming");
        }, ms + 80);
      }
      const write = () => {
        const v = view.current;
        el.style.transform = `translate3d(${v.x}px, ${v.y}px, 0) scale(${v.s})`;
      };
      // durante o gesto o quadro vira uma camada da GPU (mover não repinta os cartões); depois solta, e o navegador redesenha nítido
      el.style.willChange = "transform";
      if (zoomOut) {
        // ~2 quadros de folga (e não depende de requestAnimationFrame, que pausa com a aba escondida)
        outRaf.current = window.setTimeout(() => {
          outRaf.current = 0;
          write();
        }, 34);
      } else el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
      if (promoteTimer.current) window.clearTimeout(promoteTimer.current);
      const out = s <= limits().minS * 1.02;
      // com o mural inteiro à vista a camada fica como está: soltá-la fazia o navegador redesenhar tudo de uma vez (a "piscada" ao afastar)
      promoteTimer.current = out
        ? null
        : window.setTimeout(() => {
            if (world.current) world.current.style.willChange = "";
          }, animate ? ms + 120 : 240);
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
      touched.current = true;
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
        // começa mostrando o mural inteiro (o botão "Aproximar", a pinça e o toque duplo ampliam); no celular, com startZoomed, já abre ampliado e centralizado
        const { minS, defS } = limits();
        // ampliado = o mural preenche a altura da área (a tela do celular é alta e o mural, largo): aparece o centro, com as bordas cortadas dos lados
        const s0 = startZoomedRef.current && r.width < 700 ? Math.min(defS, Math.max(minS, r.height / WORLD_H)) : minS;
        view.current = clampView((r.width - WORLD_W * s0) / 2, (r.height - WORLD_H * s0) / 2, s0);
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

  // o mural pode abrir trancado (inteiro) e destrancar depois: nesse caso o zoom inicial entra quando startZoomed vira verdadeiro, se a pessoa ainda não mexeu
  useEffect(() => {
    if (!startZoomed || touched.current || !ready.current) return;
    const { w, h } = size.current;
    if (w <= 0 || w >= 700) return;
    const { minS, defS } = limits();
    const s0 = Math.min(defS, Math.max(minS, h / WORLD_H));
    view.current = clampView((w - WORLD_W * s0) / 2, (h - WORLD_H * s0) / 2, s0);
    apply(false);
  }, [startZoomed, apply, clampView, limits]);

  // dica de arrastar: na primeira vez do dia que o mural abre ampliado no celular, o quadro balança de leve para um lado e para o outro
  // e aparece um aviso discreto (some sozinho ou assim que a pessoa mexe). Vale para qualquer conta, nova ou antiga.
  const [hint, setHint] = useState(false);
  const hintDone = useRef(false);
  useEffect(() => {
    if (!startZoomed || hintDone.current || touched.current || !ready.current) return;
    const { w, h } = size.current;
    if (w <= 0 || w >= 700) return;
    const today = new Date().toLocaleDateString("sv-SE");
    try {
      if (localStorage.getItem("pinz:pan-hint") === today) return;
    } catch {}
    hintDone.current = true;
    const base = view.current.x;
    const timers: number[] = [];
    const go = (at: number, x: number, ms: number) =>
      timers.push(
        window.setTimeout(() => {
          if (touched.current || pointers.current.size > 0) return;
          view.current = clampView(x, view.current.y, view.current.s);
          apply(true, ms);
        }, at),
      );
    timers.push(
      window.setTimeout(() => {
        if (touched.current) return;
        try {
          localStorage.setItem("pinz:pan-hint", today);
        } catch {}
        setHint(true);
      }, 700),
    );
    // vai até a ponta de um lado, atravessa até a ponta do outro (mostra que o mural é grande) e volta ao centro
    go(900, -1e6, 1100);
    go(2150, 1e6, 1700);
    go(3950, base, 1100);
    timers.push(window.setTimeout(() => setHint(false), 5600));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [startZoomed, apply, clampView]);

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
      const { defS, minS } = limits();
      const s = view.current.s;
      // perto do máximo: volta ao padrão; senão, amplia onde tocou
      const target = s >= defS * 0.85 ? (s > defS * 1.05 ? defS : minS) : Math.min(defS, Math.max(s * 2.2, defS * 1.8));
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
      if (!dragged.current && Math.hypot(dx, dy) > DRAG_PX) {
        dragged.current = true;
        if (e.pointerType === "mouse" && box.current) box.current.dataset.panning = "1"; // mão fechada enquanto arrasta (ver globals.css)
      }
      if (dragged.current) {
        if (swiped.current) return; // depois de trocar, o resto da arrastada não faz nada
        const want = pan.current.vx + dx;
        const next = clampView(want, pan.current.vy + dy, view.current.s);
        const over = want - next.x; // quanto o dedo passou da borda lateral
        if (swipeRef.current && Math.abs(over) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
          swiped.current = true;
          swipeRef.current(over < 0 ? 1 : -1);
          return;
        }
        view.current = next;
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
      if (box.current) delete box.current.dataset.panning;
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
    touched.current = true;
    setHint(false);
    // mouse sobre um pin que o dono pode arrastar: quem cuida disso é o próprio pin, o quadro não começa a mover
    if (e.pointerType === "mouse" && e.target instanceof Element && e.target.closest("[data-pin-drag]")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const p = rel(e, true); // lê o retângulo uma vez, no começo do toque
    pointers.current.set(e.pointerId, p);
    if (world.current) world.current.style.transition = "none";
    if (pointers.current.size === 1) {
      pan.current = { px: p.x, py: p.y, vx: view.current.x, vy: view.current.y };
      dragged.current = false;
      swiped.current = false;
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
      data-tour="board"
      onPointerDown={onPointerDown}
      onClickCapture={onClickCapture}
      className={`relative size-full touch-none overflow-hidden select-none ${bare ? "" : "bg-[#3b2616]"}`}
      style={{ touchAction: "none" }}
    >
      {ambient && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ambient} alt="" aria-hidden draggable={false} className="pointer-events-none absolute inset-0 size-full scale-110 object-cover opacity-80 blur-md" />
      )}
      <div ref={world} className="absolute top-0 left-0 origin-top-left [container-type:size]" style={{ width: WORLD_W, height: WORLD_H }}>
        {children}
      </div>

      {hint && (
        <div aria-hidden className="pointer-events-none absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3.5 py-1.5 text-sm font-semibold text-white shadow-[0_0.2rem_0.7rem_rgba(0,0,0,.4)] backdrop-blur-sm transition-opacity">
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3 5 8l5 5" />
          </svg>
          Arraste para os lados
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 3 5 5-5 5" />
          </svg>
        </div>
      )}

      {cornerLeft && (
        <div data-zoom-controls onPointerDown={(e) => e.stopPropagation()} className="absolute bottom-3 left-3 z-20">
          {cornerLeft}
        </div>
      )}

      {!hideControls && (
        <button
          type="button"
          data-zoom-controls
          onPointerDown={(e) => e.stopPropagation()}
          onClick={toggleZoom}
          data-tour="zoom"
          aria-label={zoomedOut ? "Aproximar o mural" : "Afastar o mural"}
          title={zoomedOut ? "Aproximar" : "Afastar"}
          className={`absolute ${controlPos} z-20 inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-white/80 bg-[#17110c]/95 px-4 text-sm font-semibold text-white shadow-[0_0_0_2px_rgba(23,17,12,.55),0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]`}
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
