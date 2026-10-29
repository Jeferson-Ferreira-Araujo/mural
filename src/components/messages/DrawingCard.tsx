import { handOf, tapeOf, type HandId, type TapeColor } from "@/lib/style";
import { Tape } from "./fasteners";
import { useTranslations } from "next-intl";
import { fitSize } from "@/lib/fitText";
import { useLit } from "@/i18n/literal";

/** Desenho feito pela pessoa: folha de papel presa com fita. `src` = imagem do desenho; sem `src`, mostra uma folha em branco. */
export function DrawingCard({ caption, src, font, tape }: { caption: string; src?: string; font?: HandId; tape?: TapeColor }) {
  const tl = useLit();
  const tx = useTranslations("components.messages.DrawingCard");
  const hand = handOf(font);
  return (
    <article data-body aria-label={tx("desenho")} className="paper-grain shadow-paper relative w-[15em] bg-[#fdfcf7] p-[0.7em]" style={{ borderRadius: "0.15em" }}>
      <Tape className="-top-[0.8em] left-1/2 -translate-x-1/2" rotate={2} tone={tape ? tapeOf(tape).tone : undefined} />
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-white shadow-[inset_0_0_0.25em_rgba(0,0,0,.25)]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={caption || tl("Desenho")} className="size-full object-cover" draggable={false} />
        ) : null}
      </div>
      {caption && (
        <p className="mt-[0.4em] leading-[1.05] text-[#2b2b3a] [overflow-wrap:anywhere]" style={{ fontFamily: hand.family, fontSize: `${fitSize(caption, { w: 13.6, h: 3.4, lh: 1.05, max: 1.5, min: 1.0, hand: hand.scale }) * hand.scale}em` }}>
          {caption}
        </p>
      )}
    </article>
  );
}
