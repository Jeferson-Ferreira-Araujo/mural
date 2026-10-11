"use client";

import { handOf, pinOf, tapeOf, type HandId, type PinColor, type PinPos, type TapeColor } from "@/lib/style";
import { useInDetail } from "../board/ListEditContext";
import { PinSlot, TapeSlot } from "./fasteners";
import { Scene, type SceneVariant } from "./Scene";

/** Foto em Polaroid. `src` = foto escolhida pela pessoa; sem `src`, usa uma cena ilustrada de exemplo. */
export function PolaroidPhoto({ caption, scene = "hills", src, font, pin, tape, pos, ratio }: { caption: string; scene?: SceneVariant; src?: string; font?: HandId; pin?: PinColor; tape?: TapeColor; pos?: PinPos; /** largura ÷ altura da foto: o quadro se ajusta a ela (sem cortar) mantendo o lado maior no tamanho padrão */ ratio?: number }) {
  const hand = handOf(font);
  const detail = useInDetail(); // no detalhe a moldura é mais fina e a foto ocupa o que sobra da janela
  const r = ratio ? Math.min(2, Math.max(0.5, ratio)) : 1;
  // a foto cabe numa caixa de 12,2em de largura (como o quadro padrão); a vertical pode ser um pouco mais alta (12,5em) para aproveitar o espaço
  const photoW = Math.min(12.2, (detail ? 14 : 12.5) * r);
  const frame = detail ? 0.5 : 0.9; // moldura branca
  const cardW = Math.max(photoW + frame * 2, detail ? 6.6 : 8.6); // um mínimo só para a legenda caber
  return (
    <article
      aria-label="Foto"
      className="paper-grain shadow-paper relative bg-[#fdfcf7]"
      style={{ borderRadius: "0.15em", width: `${cardW}em`, padding: `${frame}em` }}
    >
      {scene === "group" || src || tape ? (
        <TapeSlot top="-top-[0.8em]" at="center" tone={tape ? tapeOf(tape).tone : undefined} />
      ) : (
        <PinSlot tone={pin ? pinOf(pin).id : "red"} pos={pos} top="top-[-0.6em]" />
      )}
      <div className="relative mx-auto overflow-hidden bg-[#222] shadow-[inset_0_0_0.6em_rgba(0,0,0,.55)]" style={{ width: `${photoW}em`, aspectRatio: r }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={caption || "Foto"} className="size-full object-cover" draggable={false} />
        ) : (
          <Scene variant={scene} />
        )}
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.18),transparent_40%)]" />
      </div>
      {caption && <p className="mt-[0.4em] leading-[1.05] text-[#2b2b3a] [overflow-wrap:anywhere]" style={{ fontFamily: hand.family, fontSize: `${1.5 * hand.scale}em` }}>
          {caption}
        </p>}
    </article>
  );
}
