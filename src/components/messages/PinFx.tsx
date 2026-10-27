"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pin } from "./Pin";

/** Pins sem tachinha nem fita no próprio cartão (players e mapa): o fixado ganha uma tachinha dourada por cima. */
const NO_FASTENER = new Set(["music", "video", "voice", "place"]);

/**
 * Valor que troca no meio de uma animação: `shown` muda depois de `lag` ms (tachinha no alto, folha de lado) e `run` vale até `total` ms.
 * Na primeira exibição não anima (só quando o valor muda com o pin na tela).
 */
export function useSwap(value: boolean, lag: number, total: number) {
  const [shown, setShown] = useState(value);
  const [run, setRun] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setRun(true);
    const a = window.setTimeout(() => setShown(value), lag);
    const b = window.setTimeout(() => setRun(false), total);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [value, lag, total]);
  return { shown, run };
}

/** Pin fixado: a tachinha (ou fita) vermelha sai, e uma dourada é colocada no lugar; ao desafixar, o contrário. */
export function PinFx({ pinned, type, children }: { pinned: boolean; type?: string; children: ReactNode }) {
  const g = useSwap(pinned, 360, 900);
  return (
    <div className={`relative w-fit ${g.shown ? "pz-gold" : ""} ${g.run ? "pz-swap" : ""}`}>
      {children}
      {g.shown && type && NO_FASTENER.has(type) && <Pin pos="center" className="top-[-0.3em]" style={{ animation: g.run ? "pz-drop .45s ease-in both" : undefined }} extra />}
    </div>
  );
}
