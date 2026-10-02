import type { PostItColor } from "@/lib/types";
import { Pin } from "./fasteners";

const palette: Record<PostItColor, { bg: string; edge: string; pin: string }> = {
  yellow: { bg: "#fbe36a", edge: "#e9c93f", pin: "#c43b2f" },
  pink: { bg: "#f7a8c0", edge: "#e38aa7", pin: "#2f6fb5" },
  green: { bg: "#b9e08a", edge: "#9cc86a", pin: "#c43b2f" },
  orange: { bg: "#fbbd78", edge: "#eba15a", pin: "#2f6fb5" },
  blue: { bg: "#9fd3ee", edge: "#7fb9d8", pin: "#c43b2f" },
};

export function PostIt({ color, text }: { color: PostItColor; text: string }) {
  const c = palette[color];
  return (
    <article
      aria-label="Post-it"
      className="paper-grain curl shadow-paper relative flex h-[12em] w-[12em] flex-col px-[1.1em] pt-[1.8em] pb-[1em]"
      style={{
        background: `linear-gradient(180deg, ${c.bg} 0%, ${c.bg} 86%, ${c.edge} 100%)`,
        borderRadius: "0.1em 0.1em 0.5em 0.1em / 0.1em 0.1em 1.2em 0.1em",
      }}
    >
      <Pin color={c.pin} className="top-[0.5em] left-1/2 -translate-x-1/2" />
      <p className="font-hand text-[1.55em] leading-[1.05] text-[#3a2a12]">{text}</p>
      <span className="font-hand mt-auto self-end text-[1.05em] text-[#3a2a12]/60">— anônimo</span>
    </article>
  );
}
