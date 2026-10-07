"use client";

import { useEffect, useRef } from "react";
import { badgeDef, badgeSrc, BADGE_EM, type PlacedBadge } from "@/lib/badges";
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
  const sizeRef = useRef<number>(b.size ?? 1);
  sizeRef.current = b.size ?? 1;
  const lastType = useRef("mouse");

  // ouvinte nativo: o quadro do celular também escuta o toque (arrastar/pinçar) e não pode "roubar" este gesto
  useEffect(() => {
    const el = ref.current;
    if (!el || !editable) return;
    const down = (ev: PointerEvent) => {
      ev.stopPropagation();
      lastType.current = ev.pointerType;
      selectRef.current(null); // começou um arraste: fecha os controles
      beginRef.current(ev, { kind: "placed", id: b.id, key: b.key, size: sizeRef.current }, el);
    };
    // no celular, um toque (sem arrastar) mostra os controles +, − e lixeira
    const tap = () => {
      if (lastType.current !== "mouse") selectRef.current(b.id);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("click", tap);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("click", tap);
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
        width: `${BADGE_EM * (b.size === 2 ? 2 : 1)}em`,
        aspectRatio: def.ratio,
        transform: "translate(-50%, -50%)",
        opacity: draggingId === b.id ? 0.25 : 1,
        filter: "drop-shadow(0.12em 0.22em 0.2em rgba(30,12,0,.5))",
      }}
    >
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
