import { handOf, pinOf, tapeOf, type HandId, type PinColor, type PinPos, type TapeColor } from "@/lib/style";
import { PinSlot, TapeSlot } from "./fasteners";
import { Scene, type SceneVariant } from "./Scene";

/** Foto em Polaroid. `src` = foto escolhida pela pessoa; sem `src`, usa uma cena ilustrada de exemplo. */
export function PolaroidPhoto({ caption, scene = "hills", src, font, pin, tape, pos }: { caption: string; scene?: SceneVariant; src?: string; font?: HandId; pin?: PinColor; tape?: TapeColor; pos?: PinPos }) {
  const hand = handOf(font);
  return (
    <article
      aria-label="Foto"
      className="paper-grain shadow-paper relative w-[14em] bg-[#fdfcf7] px-[0.9em] pt-[0.9em] pb-[0.9em]"
      style={{ borderRadius: "0.15em" }}
    >
      {scene === "group" || src || tape ? (
        <TapeSlot top="-top-[0.8em]" at="center" tone={tape ? tapeOf(tape).tone : undefined} />
      ) : (
        <PinSlot tone={pin ? pinOf(pin).id : "red"} pos={pos} top="top-[-0.6em]" />
      )}
      <div className="relative aspect-square w-full overflow-hidden bg-[#222] shadow-[inset_0_0_0.6em_rgba(0,0,0,.55)]">
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
