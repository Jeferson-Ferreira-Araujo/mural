"use client";

import { useEffect, useRef } from "react";
import { badgeDef, badgeSrc, BADGE_EM, DEFAULT_SCALE, type PlacedBadge } from "@/lib/badges";
import { useBadges } from "./BadgeContext";

function PlacedItem({ b }: { b: PlacedBadge }) {
  const ctx = useBadges();
  const { begin, draggingId, hover, select } = ctx;
  const editable = ctx.editable && b.mine !== false; // no mural compartilhado, o botom da outra pessoa só ela mexe
  const ref = useRef<HTMLDivElement>(null);
  const beginRef = useRef(begin);
  beginRef.current = begin;
  const selectRef = useRef(select);
  selectRef.current = select;
  const scaleRef = useRef<number>(b.scale ?? DEFAULT_SCALE);
  scaleRef.current = b.scale ?? DEFAULT_SCALE;
  const lastType = useRef("mouse");
  const tapStart = useRef<{ x: number; y: number; t: number } | null>(null);

  // ouvinte nativo: o quadro do celular também escuta o toque (arrastar/pinçar) e não pode "roubar" este gesto
  useEffect(() => {
    const el = ref.current;
    if (!el || !editable) return;
    const down = (ev: PointerEvent) => {
      ev.stopPropagation();
      lastType.current = ev.pointerType;
      tapStart.current = { x: ev.clientX, y: ev.clientY, t: performance.now() };
      selectRef.current(null); // começou um arraste: fecha os controles
      beginRef.current(ev, { kind: "placed", id: b.id, key: b.key, scale: scaleRef.current }, el);
    };
    // no celular, um toque (sem arrastar) mostra os controles +, − e lixeira. Reage ao levantar o dedo (o quadro atrasa o "clique" 0,3 s)
    const up = (ev: PointerEvent) => {
      const s0 = tapStart.current;
      tapStart.current = null;
      if (!s0 || ev.pointerType === "mouse") return;
      if (Math.hypot(ev.clientX - s0.x, ev.clientY - s0.y) < 8 && performance.now() - s0.t < 600) selectRef.current(b.id);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
    };
  }, [editable, b.id, b.key]);

  const def = badgeDef(b.key);
  if (!def) return null;
  return (
    <div
      ref={ref}
      data-badge-id={b.id}
      onPointerEnter={(e) => editable && e.pointerType === "mouse" && hover(b.id)}
      onPointerLeave={(e) => editable && e.pointerType === "mouse" && hover(null)}
      className={`absolute ${editable ? "pointer-events-auto cursor-grab touch-none active:cursor-grabbing" : ""}`}
      style={{
        left: `${b.x}%`,
        top: `${b.y}%`,
        width: `${(BADGE_EM * (b.scale ?? DEFAULT_SCALE)) / 100}em`,
        aspectRatio: def.ratio,
        transform: `translate(-50%, -50%) rotate(${b.rotation ?? 0}deg)`,
        opacity: draggingId === b.id ? 0.25 : 1,
        filter: "drop-shadow(0.12em 0.22em 0.2em rgba(30,12,0,.5))",
      }}
    >
      {/* área de toque maior no celular: o botton é pequeno para acertar com o dedo */}
      {editable && <span aria-hidden className="absolute -inset-0 [@media(pointer:coarse)]:-inset-[3em]" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={badgeSrc(b.key)} alt="" draggable={false} className="pointer-events-none block size-full select-none" />
    </div>
  );
}

/** Camada dos botons, por cima dos pinz e das tachinhas. Fica dentro da área útil do quadro (as posições são % dela). */
export function BadgeLayer() {
  const { badges } = useBadges();
  return (
    <div data-badge-layer className="pointer-events-none absolute inset-0 z-[40]">
      {badges.map((b) => (
        <PlacedItem key={b.id} b={b} />
      ))}
    </div>
  );
}
