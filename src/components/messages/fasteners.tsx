"use client";

import { createContext, useContext } from "react";
import { PIN_POSITIONS, POS_LABEL, posOf, type PinColor, type PinPos } from "@/lib/style";
import { Pin, PIN_LEFT } from "./Pin";

export { Pin };

/** Só na prévia do compositor: mostra silhuetas clicáveis nas outras posições da tachinha/fita. */
const PickCtx = createContext<{ onPick: (p: PinPos) => void } | null>(null);
export const FastenerPicker = PickCtx.Provider;

/** Tachinha na posição escolhida (`top` = classe de topo do card). Na prévia, as outras posições viram silhuetas clicáveis. */
export function PinSlot({ tone, pos, top }: { tone?: PinColor; pos?: PinPos; top: string }) {
  const pick = useContext(PickCtx);
  const at = posOf(pos);
  return (
    <>
      <Pin tone={tone} pos={at} className={top} />
      {pick &&
        PIN_POSITIONS.filter((p) => p !== at).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => pick.onPick(p)}
            aria-label={`Prender ${POS_LABEL[p]}`}
            title={`Prender ${POS_LABEL[p]}`}
            className={`group absolute z-30 -mt-[0.85em] -mr-[0.55em] -ml-[0.95em] block w-[3em] cursor-pointer ${top}`}
            style={{ left: `${PIN_LEFT[p]}em` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/tachinha.webp" alt="" aria-hidden draggable={false} className="block w-full opacity-30 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60" style={{ filter: "brightness(0)", transform: p === "right" ? "scaleX(-1)" : undefined }} />
          </button>
        ))}
    </>
  );
}

const TAPE_AT: Record<PinPos, { cls: string; rotate: number }> = {
  left: { cls: "left-[1.2em]", rotate: -5 },
  center: { cls: "left-1/2 -translate-x-1/2", rotate: -3 },
  right: { cls: "right-[1.2em]", rotate: 5 },
};

/** Fita no lugar fixo de cada card (`at`): a posição da fita não é escolhida por quem cola o pin. */
export function TapeSlot({ tone, at, top }: { tone?: string; at: PinPos; top: string }) {
  return <Tape className={`${top} ${TAPE_AT[at].cls}`} rotate={TAPE_AT[at].rotate} tone={tone} />;
}

/** Fita adesiva translúcida. */
export function Tape({
  className = "",
  rotate = -3,
  tone = "rgba(238, 224, 168, .72)",
}: {
  className?: string;
  rotate?: number;
  tone?: string;
}) {
  return (
    <span
      aria-hidden
      className={`absolute z-20 block h-[1.9em] w-[6em] ${className}`}
      style={{
        transform: `rotate(${rotate}deg)`,
        background: `linear-gradient(90deg, rgba(255,255,255,.25), transparent 30%, rgba(255,255,255,.18) 70%, transparent), ${tone}`,
        boxShadow: "0 0.1em 0.25em rgba(40,20,5,.25)",
        clipPath:
          "polygon(0 8%, 4% 0, 8% 10%, 12% 0, 16% 8%, 20% 0, 100% 0, 100% 100%, 20% 100%, 16% 92%, 12% 100%, 8% 90%, 4% 100%, 0 92%)",
        backdropFilter: "blur(0.5px)",
      }}
    />
  );
}

export function PlayButton({
  playing,
  onClick,
  label,
  className = "",
}: {
  playing: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={playing ? `Pausar ${label}` : `Reproduzir ${label}`}
      aria-pressed={playing}
      className={`grid shrink-0 cursor-pointer place-items-center rounded-full transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${className}`}
    >
      {playing ? (
        <svg viewBox="0 0 24 24" className="size-[45%]" fill="currentColor" aria-hidden>
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-[45%] translate-x-[8%]" fill="currentColor" aria-hidden>
          <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
        </svg>
      )}
    </button>
  );
}
