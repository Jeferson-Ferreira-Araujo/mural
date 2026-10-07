"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";

/**
 * Barra de arrastar própria (vertical ou horizontal) para o dedo: o navegador não puxa a página nem recarrega,
 * a área de toque é grande e o valor vem direto da posição do dedo. Em cima/à direita = maior.
 */
export function TouchSlider({
  value,
  min,
  max,
  onChange,
  onEnd,
  vertical = false,
  length,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  /** soltou a barra (ou terminou de usar o teclado): hora de gravar */
  onEnd: () => void;
  vertical?: boolean;
  /** comprimento da trilha, em px */
  length: number;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const frac = (value - min) / (max - min);

  const read = (e: PointerEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const pad = 12; // a bolinha não passa das pontas
    const f = vertical ? 1 - (e.clientY - r.top - pad) / (r.height - pad * 2) : (e.clientX - r.left - pad) / (r.width - pad * 2);
    onChange(min + Math.max(0, Math.min(1, f)) * (max - min));
  };
  const key = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    const up = e.key === "ArrowUp" || e.key === "ArrowRight";
    const down = e.key === "ArrowDown" || e.key === "ArrowLeft";
    if (!up && !down) return;
    e.preventDefault();
    onChange(Math.max(min, Math.min(max, value + (up ? step : -step))));
  };

  const thumb = vertical ? 22 : 18;
  return (
    <div
      ref={box}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation={vertical ? "vertical" : "horizontal"}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragging.current = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId); // o dedo continua valendo mesmo saindo da barra
        } catch {}
        read(e);
      }}
      onPointerMove={(e) => dragging.current && read(e)}
      onPointerUp={(e) => {
        if (!dragging.current) return;
        dragging.current = false;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
        onEnd();
      }}
      onPointerCancel={() => {
        if (!dragging.current) return;
        dragging.current = false;
        onEnd();
      }}
      onKeyDown={key}
      onKeyUp={(e) => (e.key.startsWith("Arrow") ? onEnd() : undefined)}
      className="relative cursor-pointer touch-none outline-none select-none focus-visible:ring-2 focus-visible:ring-[#f6c93f]/70"
      style={vertical ? { width: 36, height: length } : { width: length, height: 26 }}
    >
      {/* trilha */}
      <span
        aria-hidden
        className="absolute rounded-full bg-white/25"
        style={vertical ? { left: "50%", width: 4, top: 12, bottom: 12, transform: "translateX(-50%)" } : { top: "50%", height: 4, left: 12, right: 12, transform: "translateY(-50%)" }}
      />
      {/* parte preenchida */}
      <span
        aria-hidden
        className="absolute rounded-full bg-[#f6c93f]"
        style={
          vertical
            ? { left: "50%", width: 4, bottom: 12, height: `calc((100% - 24px) * ${frac})`, transform: "translateX(-50%)" }
            : { top: "50%", height: 4, left: 12, width: `calc((100% - 24px) * ${frac})`, transform: "translateY(-50%)" }
        }
      />
      {/* bolinha */}
      <span
        aria-hidden
        className="absolute rounded-full border-2 border-white bg-[#f6c93f] shadow-[0_0.1rem_0.4rem_rgba(0,0,0,.5)]"
        style={
          vertical
            ? { left: "50%", width: thumb, height: thumb, bottom: `calc(12px + (100% - 24px) * ${frac} - ${thumb / 2}px)`, transform: "translateX(-50%)" }
            : { top: "50%", width: thumb, height: thumb, left: `calc(12px + (100% - 24px) * ${frac} - ${thumb / 2}px)`, transform: "translateY(-50%)" }
        }
      />
    </div>
  );
}
