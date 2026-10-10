"use client";

import { useCallback, useRef } from "react";

/**
 * Arrastar um pin para outro espaço do quadro (só quem cuida do mural). No mouse, começa depois de mover alguns pixels;
 * no toque, segurando o dedo no pin por um instante (arrastar logo de cara continua movendo o quadro).
 * Soltar sobre um espaço vazio move o pin; sobre outro pin, os dois trocam de lugar; no próprio espaço ou fora de qualquer outro, o pin é só deslocado um pouco (`onNudge`). `onMove` recebe o id e o espaço de destino.
 */
const HOLD_MS = 350;
const MOUSE_PX = 6;
const TOUCH_SLOP = 8;

export function usePinDrag(onMove: ((id: string, slot: number) => void) | null, onNudge?: (id: string, mv: { dx: number; dy: number; k: number; rect: { left: number; right: number; top: number; bottom: number } }) => void, onCheck?: (id: string, mv: { dx: number; dy: number; k: number; rect: { left: number; right: number; top: number; bottom: number } }) => string | null) {
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
      let gk = 1;
      let reasonEl: HTMLElement | null = null;
      let g0 = { left: 0, right: 0, top: 0, bottom: 0 };
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
          if (!s) continue;
          // espaço vazio: só vale perto do centro dele (mais pra fora, o pin fica solto onde foi deixado); espaço com pin: troca de lugar
          if (!s.hasAttribute("data-pin-id")) {
            const r = s.getBoundingClientRect();
            if (Math.abs(x - (r.left + r.width / 2)) > r.width * 0.3 || Math.abs(y - (r.top + r.height / 2)) > r.height * 0.3) continue;
          }
          return s;
        }
        return null;
      };
      const place = () => {
        if (ghost) ghost.style.transform = `translate(${lx - offX}px, ${ly - offY}px) scale(${ghost.dataset.k})`;
        const over = slotAt(lx, ly);
        setTarget(over);
        if (ghost) {
          // fora de qualquer espaço: o pin só será deslocado; o contorno do fantasma mostra se aqui pode (verde) ou não (vermelho)
          if (!over && onCheck) {
            const why = onCheck(id, { dx: lx - sx, dy: ly - sy, k: gk, rect: g0 }); // null = pode; texto = o motivo de não poder
            ghost.style.outline = `0.28em solid ${why ? "#ff6b5b" : "#6fdc8c"}`;
            ghost.style.outlineOffset = "0.25em";
            // o motivo aparece junto do pin enquanto ele está vermelho
            if (why) {
              if (!reasonEl) {
                reasonEl = document.createElement("div");
                Object.assign(reasonEl.style, { position: "fixed", zIndex: "10000", pointerEvents: "none", maxWidth: "min(80vw, 18rem)", padding: "6px 10px", borderRadius: "10px", background: "rgba(23,17,12,.92)", color: "#fff", font: "600 13px/1.25 system-ui, sans-serif", boxShadow: "0 4px 14px rgba(0,0,0,.45)" });
                document.body.appendChild(reasonEl);
              }
              reasonEl.textContent = why.replace(/^Não dá para soltar aqui: /, "Aqui não: ");
              reasonEl.style.left = `${Math.max(8, Math.min(lx - 80, window.innerWidth - 260))}px`;
              reasonEl.style.top = `${Math.max(8, ly - offY - 46)}px`;
            } else if (reasonEl) {
              reasonEl.remove();
              reasonEl = null;
            }
          } else {
            ghost.style.outline = "none";
            if (reasonEl) {
              reasonEl.remove();
              reasonEl = null;
            }
          }
        }
      };
      const begin = () => {
        dragging = true;
        suppress.current = true;
        document.body.classList.add("pin-dragging");
        const r = el.getBoundingClientRect();
        const k = el.offsetWidth ? r.width / el.offsetWidth : 1;
        offX = sx - r.left;
        offY = sy - r.top;
        gk = k;
        g0 = { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
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
        reasonEl?.remove();
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
          if (Number.isInteger(to) && to !== slot) {
            onMove?.(id, to);
          } else {
            // soltou no próprio espaço ou fora de qualquer outro: o pin só é deslocado um pouco (continua no espaço dele)
            onNudge?.(id, { dx: ev.clientX - sx, dy: ev.clientY - sy, k: gk, rect: g0 });
          }
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
    [onMove, onNudge, onCheck],
  );

  return { start, wasDrag: () => suppress.current };
}
