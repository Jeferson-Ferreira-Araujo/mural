"use client";

import { useEffect, useRef } from "react";
import { badgeDef, badgeSrc, baseEmOf, baseEmOfBadge, DEFAULT_SCALE, DISPLAY_SCALE, isDisplayKey, ratioOfBadge, type PlacedBadge } from "@/lib/badges";
import { NATURAL_W, shapeOfStyle } from "@/lib/displayShape";
import { SecretCover } from "./SecretCover";
import { DisplayCard } from "../widgets";
import { useBadges } from "./BadgeContext";
import { useLit } from "@/i18n/literal";

const HOLD_MS = 380; // tempo de segurar um widget no celular para movê-lo

function PlacedItem({ b }: { b: PlacedBadge }) {
  const tl = useLit();
  const ctx = useBadges();
  const { begin, draggingId, select } = ctx;
  const display0 = isDisplayKey(b.key) || b.kind === "display";
  // no mural compartilhado, o botom da outra pessoa só ela mexe; no mural de exemplo, qualquer pessoa arrasta os bottons (os displays só abrem)
  const editable = (ctx.editable && b.mine !== false) || (ctx.demo && !display0);
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
    // partes do cartão com ação própria (ex.: "Marcar hoje" do hábito) não mexem no display: nada de arrastar, selecionar ou abrir o detalhe
    const own = (ev: Event) => ev.target instanceof Element && !!ev.target.closest("[data-no-badge-drag]");
    const dbl = (ev: Event) => {
      if (own(ev)) return;
      if (display) openRef.current(b.id);
    };
    const down = (ev: PointerEvent) => {
      if (own(ev)) return;
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
      if (own(ev)) return;
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
    const w = (baseEmOfBadge(b.key, b.data) * (b.scale ?? DISPLAY_SCALE)) / 100; // largura do display, em em do quadro (o quadrado é menor)
    const shape = shapeOfStyle(b.data?.style);
    return (
      <div
        ref={ref}
        data-badge-id={b.id}
        data-badge-kind="display"
        // quem vê o mural (não é o dono): tocar no widget abre o detalhe
        {...(!editable ? { role: "button", tabIndex: 0, "aria-label": tl("Ver o display em tamanho grande"), onClick: () => ctx.openDetail(b.id), onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && ctx.openDetail(b.id) } : {})}
        className={`pz-badge-in group absolute ${editable ? "pointer-events-auto cursor-zoom-in touch-none" : "pointer-events-auto cursor-zoom-in"}`}
        style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${w}em`, aspectRatio: ratioOfBadge(b.key, b.data), transform: `translate(-50%, -50%) rotate(${b.rotation ?? 0}deg)`, opacity: draggingId === b.id ? 0.25 : 1, animationDelay: `${(0.1 + (b.y / 100) * 0.6).toFixed(2)}s` }}
      >
        {editable && <span aria-hidden className="absolute inset-0" />}
        {/* o widget tem NATURAL_W em de largura na própria fonte (24 no retangular, 12 no quadrado): a fonte do contêiner o ajusta à largura w */}
        <div className="pointer-events-none transition-transform duration-300 ease-out [@media(hover:hover)]:group-hover:-translate-y-[0.35em] [@media(hover:hover)]:group-hover:scale-[1.2]" style={{ fontSize: `${w / NATURAL_W[shape]}em` }}>
          {b.hidden ? (
            // display em segredo: o mesmo cartão borrado do pin em segredo (quem visita nem recebe os dados; o dono vê o conteúdo no detalhe)
            <SecretCover style={b.data?.style} locked={!editable} />
          ) : b.data ? (
            <DisplayCard data={b.data} badgeId={b.id} />
          ) : null}
        </div>
      </div>
    );
  }
  if (!def) return null;
  return (
    <div
      ref={ref}
      data-badge-id={b.id}
      className={`pz-badge-in absolute ${editable ? "pointer-events-auto cursor-grab touch-none active:cursor-grabbing" : ""}`}
      style={{
        left: `${b.x}%`,
        top: `${b.y}%`,
        width: `${(baseEmOf(b.key) * (b.scale ?? DEFAULT_SCALE)) / 100}em`,
        aspectRatio: def.ratio,
        transform: `translate(-50%, -50%) rotate(${b.rotation ?? 0}deg)`,
        opacity: draggingId === b.id ? 0.25 : 1,
        filter: "drop-shadow(0.12em 0.22em 0.2em rgba(30,12,0,.5))",
        animationDelay: `${(0.1 + (b.y / 100) * 0.6).toFixed(2)}s`,
      }}
    >
      {/* área de toque maior no celular: o botton é pequeno para acertar com o dedo */}
      {editable && <span aria-hidden className="absolute -inset-0 [@media(pointer:coarse)]:-inset-[0.5em]" />}
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
      {/* displays primeiro (embaixo) e bottons depois (por cima): um botton pode ficar sobre um display */}
      {[...badges.filter((b) => isDisplayKey(b.key) || b.kind === "display"), ...badges.filter((b) => !(isDisplayKey(b.key) || b.kind === "display"))].map((b) => (
        <PlacedItem key={b.id} b={b} />
      ))}
    </div>
  );
}
