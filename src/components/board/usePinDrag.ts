"use client";

import { useCallback, useRef } from "react";

/**
 * Arrastar um pin para outro espaço do quadro (só quem cuida do mural). No mouse, começa depois de mover alguns pixels;
 * no toque, segurando o dedo no pin por um instante (arrastar logo de cara continua movendo o quadro).
 * Soltar sobre um espaço vazio move o pin; sobre outro pin, os dois trocam de lugar. `onMove` recebe o id e o espaço de destino.
 */
const HOLD_MS = 350;
const MOUSE_PX = 6;
const TOUCH_SLOP = 8;

export function usePinDrag(onMove: ((id: string, slot: number) => void) | null) {
  const suppress = useRef(false); // logo depois de arrastar, o clique que o navegador gera não deve abrir o detalhe

  const start = useCallback(
    (e: React.PointerEvent, id: string, slot: number) => {
      if (!onMove) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const el = e.currentTarget as HTMLElement;
      const pid = e.pointerId;
      const touch = e.pointerType !== "mouse";
      const sx = e.clientX;
      const sy = e.clientY;
      let lx = sx;
      let ly = sy;
      let dragging = false;
      let ghost: HTMLElement | null = null;
      let target: HTMLElement | null = null;
      let offX = 0;
      let offY = 0;
      let timer = 0;

      const setTarget = (t: HTMLElement | null) => {
        if (t === target) return;
        target?.removeAttribute("data-drop");
        target = t;
        target?.setAttribute("data-drop", "");
      };
      const slotAt = (x: number, y: number) => {
        for (const n of document.elementsFromPoint(x, y)) {
          const s = (n as HTMLElement).closest?.("[data-slot]") as HTMLElement | null;
          if (s) return s;
        }
        return null;
      };
      const place = () => {
        if (ghost) ghost.style.transform = `translate(${lx - offX}px, ${ly - offY}px) scale(${ghost.dataset.k})`;
        setTarget(slotAt(lx, ly));
      };
      const begin = () => {
        dragging = true;
        suppress.current = true;
        document.body.classList.add("pin-dragging");
        const r = el.getBoundingClientRect();
        const k = el.offsetWidth ? r.width / el.offsetWidth : 1;
        offX = sx - r.left;
        offY = sy - r.top;
        ghost = el.cloneNode(true) as HTMLElement;
        ghost.removeAttribute("data-slot");
        ghost.removeAttribute("data-pin-drag");
        Object.assign(ghost.style, {
          position: "fixed",
          left: "0px",
          top: "0px",
          width: `${el.offsetWidth}px`,
          fontSize: getComputedStyle(el).fontSize,
          transformOrigin: "top left",
          pointerEvents: "none",
          zIndex: "9999",
          opacity: "0.92",
          filter: "drop-shadow(0 0.6em 0.6em rgba(0,0,0,.45))",
          animation: "none",
        });
        ghost.dataset.k = String(k);
        document.body.appendChild(ghost);
        el.style.opacity = "0.3";
        place();
      };
      const cleanup = () => {
        window.clearTimeout(timer);
        window.removeEventListener("pointermove", onMoveWin);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        ghost?.remove();
        el.style.opacity = "";
        setTarget(null);
        document.body.classList.remove("pin-dragging");
      };
      function onMoveWin(ev: PointerEvent) {
        if (ev.pointerId !== pid) return;
        lx = ev.clientX;
        ly = ev.clientY;
        const d = Math.hypot(lx - sx, ly - sy);
        if (!dragging) {
          if (touch) {
            if (d > TOUCH_SLOP) cleanup(); // moveu antes do tempo: é o gesto de mover o quadro
          } else if (d > MOUSE_PX) begin();
          return;
        }
        ev.preventDefault();
        place();
      }
      function onUp(ev: PointerEvent) {
        if (ev.pointerId !== pid) return;
        const dest = dragging ? slotAt(ev.clientX, ev.clientY) : null;
        const was = dragging;
        cleanup();
        if (was) {
          window.setTimeout(() => (suppress.current = false), 450);
          const to = dest ? Number(dest.dataset.slot) : NaN;
          if (Number.isInteger(to) && to !== slot) onMove?.(id, to);
        }
      }
      function onCancel(ev: PointerEvent) {
        if (ev.pointerId !== pid) return;
        const was = dragging;
        cleanup();
        if (was) window.setTimeout(() => (suppress.current = false), 450);
      }
      window.addEventListener("pointermove", onMoveWin, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      if (touch) timer = window.setTimeout(begin, HOLD_MS);
    },
    [onMove],
  );

  return { start, wasDrag: () => suppress.current };
}
