"use client";

import { useEffect, useRef } from "react";
import { badgeDef, badgeSrc, baseEmOf, DEFAULT_SCALE, DISPLAY_SCALE, isDisplayKey, type PlacedBadge } from "@/lib/badges";
import { DisplayCard, WIDGET_W } from "../widgets";
import { useBadges } from "./BadgeContext";

const HOLD_MS = 380; // tempo de segurar um widget no celular para movê-lo

function PlacedItem({ b }: { b: PlacedBadge }) {
  const ctx = useBadges();
  const { begin, draggingId, select } = ctx;
  const editable = ctx.editable && b.mine !== false; // no mural compartilhado, o botom da outra pessoa só ela mexe
  const ref = useRef<HTMLDivElement>(null);
  const beginRef = useRef(begin);
  beginRef.current = begin;
  const selectRef = useRef(select);
  selectRef.current = select;
  const openRef = useRef(ctx.openDetail);
  openRef.current = ctx.openDetail;
  const display = isDisplayKey(b.key) || b.kind === "display";
  const scaleRef = useRef<number>(b.scale ?? (display ? DISPLAY_SCALE : DEFAULT_SCALE));
  scaleRef.current = b.scale ?? (display ? DISPLAY_SCALE : DEFAULT_SCALE);
  const lastType = useRef("mouse");
  const tapStart = useRef<{ x: number; y: number; t: number } | null>(null);

  // ouvinte nativo: o quadro do celular também escuta o toque (arrastar/pinçar) e não pode "roubar" este gesto
  useEffect(() => {
    const el = ref.current;
    if (!el || !editable) return;
    // computador: duplo clique abre o detalhe do widget
    const dbl = () => {
      if (display) openRef.current(b.id);
    };
    const down = (ev: PointerEvent) => {
      lastType.current = ev.pointerType;
      tapStart.current = { x: ev.clientX, y: ev.clientY, t: performance.now() };
      // widget da loja no celular: arrastar com o dedo move o MURAL (o dedo costuma passar por cima do widget); para mover o widget é preciso apertar e segurar
      if (display && ev.pointerType !== "mouse") {
        selectRef.current(null);
        const x0 = ev.clientX;
        const y0 = ev.clientY;
        const stop = () => {
          if (timer) window.clearTimeout(timer);
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", stop);
          window.removeEventListener("pointercancel", stop);
        };
        const move = (e2: PointerEvent) => {
          if (e2.pointerId === ev.pointerId && Math.hypot(e2.clientX - x0, e2.clientY - y0) > 8) stop(); // o dedo andou: é o mural sendo arrastado
        };
        const timer = window.setTimeout(() => {
          stop();
          tapStart.current = null; // não vira toque de seleção
          navigator.vibrate?.(25);
          beginRef.current(ev, { kind: "placed", id: b.id, key: b.key, scale: scaleRef.current }, el);
        }, HOLD_MS);
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);
        window.addEventListener("pointercancel", stop);
        return; // sem stopPropagation: o quadro pode arrastar normalmente
      }
      ev.stopPropagation();
      selectRef.current(null); // começou um arraste: fecha os controles
      beginRef.current(ev, { kind: "placed", id: b.id, key: b.key, scale: scaleRef.current }, el);
    };
    // um toque ou clique (sem arrastar) mostra os controles +, − e lixeira. Reage ao levantar o dedo (o quadro atrasa o "clique" 0,3 s)
    const up = (ev: PointerEvent) => {
      const s0 = tapStart.current;
      tapStart.current = null;
      if (!s0) return;
      if (Math.hypot(ev.clientX - s0.x, ev.clientY - s0.y) < 8 && performance.now() - s0.t < (display && ev.pointerType !== "mouse" ? HOLD_MS : 600)) selectRef.current(b.id);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("dblclick", dbl);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("dblclick", dbl);
    };
  }, [editable, b.id, b.key, display]);

  const def = badgeDef(b.key);
  if (display) {
    const w = (baseEmOf(b.key) * (b.scale ?? DISPLAY_SCALE)) / 100; // largura do display, em em do quadro
    return (
      <div
        ref={ref}
        data-badge-id={b.id}
        data-badge-kind="display"
        // quem vê o mural (não é o dono): tocar no widget abre o detalhe
        {...(!editable ? { role: "button", tabIndex: 0, "aria-label": "Ver o display em tamanho grande", onClick: () => ctx.openDetail(b.id), onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && ctx.openDetail(b.id) } : {})}
        className={`absolute ${editable ? "pointer-events-auto cursor-grab touch-none active:cursor-grabbing" : "pointer-events-auto cursor-pointer"}`}
        style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${w}em`, aspectRatio: 2, transform: `translate(-50%, -50%) rotate(${b.rotation ?? 0}deg)`, opacity: draggingId === b.id ? 0.25 : 1 }}
      >
        {editable && <span aria-hidden className="absolute -inset-0 [@media(pointer:coarse)]:-inset-[1em]" />}
        {/* o widget tem WIDGET_W em de largura na própria fonte: a fonte do contêiner o ajusta à largura w */}
        <div className="pointer-events-none" style={{ fontSize: `${w / WIDGET_W}em` }}>
          {b.data ? <DisplayCard data={b.data} /> : null}
        </div>
      </div>
    );
  }
  if (!def) return null;
  return (
    <div
      ref={ref}
      data-badge-id={b.id}
      className={`absolute ${editable ? "pointer-events-auto cursor-grab touch-none active:cursor-grabbing" : ""}`}
      style={{
        left: `${b.x}%`,
        top: `${b.y}%`,
        width: `${(baseEmOf(b.key) * (b.scale ?? DEFAULT_SCALE)) / 100}em`,
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
