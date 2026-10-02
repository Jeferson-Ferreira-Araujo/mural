import type { PostItColor } from "@/lib/types";
import { Pin } from "./fasteners";

const palette: Record<PostItColor, { bg: string; edge: string; pin: string }> = {
  yellow: { bg: "#fbe36a", edge: "#e9c93f", pin: "#c43b2f" },
  pink: { bg: "#f7a8c0", edge: "#e38aa7", pin: "#c43b2f" },
  green: { bg: "#b9e08a", edge: "#9cc86a", pin: "#c43b2f" },
  orange: { bg: "#fbbd78", edge: "#eba15a", pin: "#2f6fb5" },
  blue: { bg: "#a9d8f0", edge: "#84bde0", pin: "#2f6fb5" },
};

export function PostIt({ color, text }: { color: PostItColor; text: string }) {
  const c = palette[color];
  return (
    <article
      aria-label="Post-it"
      className="paper-grain curl shadow-paper relative flex h-[13.5em] w-[14em] flex-col px-[1.3em] pt-[2.1em] pb-[1.1em]"
      style={{
        background: `linear-gradient(180deg, ${c.bg} 0%, ${c.bg} 86%, ${c.edge} 100%)`,
        borderRadius: "0.1em 0.1em 0.5em 0.1em / 0.1em 0.1em 1.2em 0.1em",
      }}
    >
      <Pin color={c.pin} className="top-[0.55em] left-[1.1em]" />
      <p className="font-hand text-[1.7em] leading-[1.08] text-[#34281a]">{text}</p>
    </article>
  );
}
