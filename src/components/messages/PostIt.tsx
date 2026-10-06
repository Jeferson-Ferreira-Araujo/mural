import type { PostItColor } from "@/lib/types";
import { handOf, type HandId, type PinColor, type PinPos } from "@/lib/style";
import { PinSlot } from "./fasteners";

const palette: Record<PostItColor, { bg: string; edge: string; pin: "red" | "blue" }> = {
  yellow: { bg: "#fbe36a", edge: "#e9c93f", pin: "red" },
  pink: { bg: "#f7a8c0", edge: "#e38aa7", pin: "red" },
  green: { bg: "#b9e08a", edge: "#9cc86a", pin: "red" },
  orange: { bg: "#fbbd78", edge: "#eba15a", pin: "blue" },
  blue: { bg: "#a9d8f0", edge: "#84bde0", pin: "blue" },
};

export function PostIt({ color, text, font, pin, pos }: { color: PostItColor; text: string; font?: HandId; pin?: PinColor; pos?: PinPos }) {
  const c = palette[color];
  const hand = handOf(font);
  return (
    <article
      aria-label="Post-it"
      className="paper-grain curl shadow-paper relative flex h-[13.5em] w-[14em] flex-col px-[1.3em] pt-[2.1em] pb-[1.1em]"
      style={{
        background: `linear-gradient(180deg, ${c.bg} 0%, ${c.bg} 86%, ${c.edge} 100%)`,
        borderRadius: "0.1em 0.1em 0.5em 0.1em / 0.1em 0.1em 1.2em 0.1em",
      }}
    >
      <PinSlot tone={pin ?? c.pin} pos={pos} top="top-[0.55em]" />
      <p className="leading-[1.08] text-[#34281a] [overflow-wrap:anywhere]" style={{ fontFamily: hand.family, fontSize: `${1.7 * hand.scale}em` }}>
        {text}
      </p>
    </article>
  );
}
