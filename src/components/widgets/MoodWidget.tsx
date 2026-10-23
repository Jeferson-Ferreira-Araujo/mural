"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { baseStyle, shapeOfStyle } from "@/lib/displayShape";
import { useLit } from "@/i18n/literal";
import { WidgetFrame } from "./core";

/** Dois estilos, só o fundo muda: branco e preto. */
const SKINS: Record<string, { bg: string; ink: string; sub: string }> = {
  light: { bg: "#ffffff", ink: "#111111", sub: "#6b6b6b" },
  dark: { bg: "#0f0f10", ink: "#ffffff", sub: "rgba(255,255,255,.6)" },
};

/** Emojis de humor oferecidos ao escolher (a pessoa também pode digitar o que quiser). */
export const MOODS = ["😄", "🥰", "😌", "🤩", "😴", "😢", "😰", "😠"] as const;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Humor do dia: um emoji grande e uma frase curta. Se o humor não é de hoje, mostra a data em que foi escolhido. */
export function MoodWidget({ style = "light", emoji, note, day, frame }: { style?: string; emoji?: string; note?: string; day?: string; frame?: string | null }) {
  const tl = useLit();
  const locale = useLocale();
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(iso(new Date()));
    const t = window.setInterval(() => setToday(iso(new Date())), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const shape = shapeOfStyle(style);
  const square = shape === "square";
  const sk = SKINS[baseStyle(style)] ?? SKINS.light;
  const text = (note ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day ?? "");
  const stale = !!today && !!m && day !== today;
  let caption = tl("Como estou hoje");
  if (stale && m) {
    try {
      caption = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    } catch {
      caption = `${m[3]}/${m[2]}`;
    }
  }
  const face = <span className="leading-none" style={{ fontSize: square ? "4.6em" : "5em" }}>{(emoji ?? "").trim() || "😄"}</span>;

  return (
    <WidgetFrame frame={frame} label={tl("Humor do dia")} shape={shape}>
      <div className={`absolute inset-0 flex ${square ? "flex-col items-center justify-center gap-[0.35em] px-[1em] py-[0.9em] text-center" : "items-center gap-[1.1em] px-[1.4em] py-[1em]"}`} style={{ background: sk.bg, color: sk.ink }}>
        {face}
        <div className={`flex min-w-0 flex-col ${square ? "items-center" : "flex-1"}`}>
          <span className="text-[0.85em] leading-tight font-semibold tracking-wide uppercase" style={{ color: sk.sub }}>
            {caption}
          </span>
          {text && <p className={`mt-[0.2em] leading-tight font-bold [overflow-wrap:anywhere] ${square ? "line-clamp-3 text-[1.25em]" : "line-clamp-3 text-[1.55em]"}`}>{text}</p>}
        </div>
      </div>
    </WidgetFrame>
  );
}
