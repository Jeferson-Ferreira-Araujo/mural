"use client";

import { baseStyle, shapeOfStyle } from "@/lib/displayShape";
import { useLit } from "@/i18n/literal";
import { WidgetFrame } from "./core";
import { MoodFace } from "./MoodFace";

/** Dois estilos, só o fundo muda: branco e preto. */
const SKINS: Record<string, { bg: string; ink: string }> = {
  light: { bg: "#ffffff", ink: "#111111" },
  dark: { bg: "#0f0f10", ink: "#ffffff" },
};


/** Humor: um emoji grande e uma frase curta. Sem data: fica como está até a pessoa atualizar. */
export function MoodWidget({ style = "light", emoji, note, frame }: { style?: string; emoji?: string; note?: string; frame?: string | null }) {
  const tl = useLit();
  const shape = shapeOfStyle(style);
  const square = shape === "square";
  const sk = SKINS[baseStyle(style)] ?? SKINS.light;
  const text = (note ?? "").trim();
  const face = (emoji ?? "").trim() || "happy";

  return (
    <WidgetFrame frame={frame} label={tl("Humor do dia")} shape={shape}>
      <div className={`absolute inset-0 flex ${!text ? "items-center justify-center" : square ? "flex-col items-center justify-center gap-[0.4em] px-[1em] py-[0.9em] text-center" : "items-center gap-[1.1em] px-[1.4em] py-[1em]"}`} style={{ background: sk.bg, color: sk.ink }}>
        <MoodFace value={face} className="block shrink-0 leading-none" style={{ fontSize: !text ? (square ? "6em" : "6.5em") : square ? "4.6em" : "5em", width: "1em", height: "1em" }} />
        {text && <p className={`min-w-0 leading-tight font-bold [overflow-wrap:anywhere] ${square ? "line-clamp-3 text-[1.3em]" : "line-clamp-3 flex-1 text-[1.6em]"}`}>{text}</p>}
      </div>
    </WidgetFrame>
  );
}
