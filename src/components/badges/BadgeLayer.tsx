"use client";

import { useEffect, useRef } from "react";
import { badgeDef, badgeSrc, BADGE_EM, type PlacedBadge } from "@/lib/badges";
import { useBadges } from "./BadgeContext";

function PlacedItem({ b }: { b: PlacedBadge }) {
  const ctx = useBadges();
  const { begin, draggingId } = ctx;
  const editable = ctx.editable && b.mine !== false; // no mural compartilhado, o botom da outra pessoa só ela mexe
  const ref = useRef<HTMLDivElement>(null);
  const beginRef = useRef(begin);
  beginRef.current = begin;

  // ouvinte nativo: o quadro do celular também escuta o toque (arrastar/pinçar) e não pode "roubar" este gesto
  useEffect(() => {
    const el = ref.current;
    if (!el || !editable) return;
    const down = (ev: PointerEvent) => {
      ev.stopPropagation();
      beginRef.current(ev, { kind: "placed", id: b.id, key: b.key }, el);
    };
    el.addEventListener("pointerdown", down);
    return () => el.removeEventListener("pointerdown", down);
  }, [editable, b.id, b.key]);

  const def = badgeDef(b.key);
  if (!def) return null;
  return (
    <div
      ref={ref}
      className={`absolute ${editable ? "pointer-events-auto cursor-grab touch-none active:cursor-grabbing" : ""}`}
      style={{
        left: `${b.x}%`,
        top: `${b.y}%`,
        width: `${BADGE_EM}em`,
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
