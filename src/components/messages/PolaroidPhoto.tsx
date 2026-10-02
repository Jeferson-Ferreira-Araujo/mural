import { Pin, Tape } from "./fasteners";
import { Scene, type SceneVariant } from "./Scene";

/** Foto em Polaroid. `src` = foto escolhida pela pessoa; sem `src`, usa uma cena ilustrada de exemplo. */
export function PolaroidPhoto({ caption, scene = "hills", src }: { caption: string; scene?: SceneVariant; src?: string }) {
  return (
    <article
      aria-label="Foto"
      className="paper-grain shadow-paper relative w-[14em] bg-[#fdfcf7] px-[0.9em] pt-[0.9em] pb-[0.9em]"
      style={{ borderRadius: "0.15em" }}
    >
      {scene === "group" || src ? (
        <Tape className="-top-[0.8em] left-1/2 -translate-x-1/2" rotate={-3} />
      ) : (
        <Pin tone="red" className="top-[-0.6em] left-[1.1em]" />
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
      {caption && <p className="font-hand mt-[0.4em] text-[1.5em] leading-[1.05] text-[#2b2b3a]">{caption}</p>}
    </article>
  );
}
