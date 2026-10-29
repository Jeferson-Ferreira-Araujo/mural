import type { PostItColor } from "@/lib/types";
import { handOf, type HandId, type PinColor, type PinPos } from "@/lib/style";
import { PinSlot } from "./fasteners";
import { useTranslations } from "next-intl";
import { fitSize } from "@/lib/fitText";

const palette: Record<PostItColor, { bg: string; edge: string; pin: "red" | "blue" }> = {
  yellow: { bg: "#fbe36a", edge: "#e9c93f", pin: "red" },
  pink: { bg: "#f7a8c0", edge: "#e38aa7", pin: "red" },
  green: { bg: "#b9e08a", edge: "#9cc86a", pin: "red" },
  orange: { bg: "#fbbd78", edge: "#eba15a", pin: "blue" },
  blue: { bg: "#a9d8f0", edge: "#84bde0", pin: "blue" },
};

export function PostIt({ color, text, font, pin, pos }: { color: PostItColor; text: string; font?: HandId; pin?: PinColor; pos?: PinPos }) {
  const tx = useTranslations("components.messages.PostIt");
  const c = palette[color];
  const hand = handOf(font);
  const size = fitSize(text, { w: 11.4, h: 10.3, lh: 1.08, max: 1.7, min: 1.0, hand: hand.scale }); // a folha tem altura fixa: a letra diminui até o texto caber
  return (
    <article data-body
      aria-label={tx("postIt")}
      className="paper-grain curl shadow-paper relative flex h-[13.5em] w-[14em] flex-col px-[1.3em] pt-[2.1em] pb-[1.1em]"
      style={{
        background: `linear-gradient(180deg, ${c.bg} 0%, ${c.bg} 86%, ${c.edge} 100%)`,
        borderRadius: "0.1em 0.1em 0.5em 0.1em / 0.1em 0.1em 1.2em 0.1em",
      }}
    >
      <PinSlot tone={pin ?? c.pin} pos={pos} top="top-[0.55em]" />
      <p className="leading-[1.08] text-[#34281a] [overflow-wrap:anywhere]" style={{ fontFamily: hand.family, fontSize: `${size * hand.scale}em` }}>
        {text}
      </p>
    </article>
  );
}
