"use client";

import { useEffect, useState } from "react";
import { baseStyle, shapeOfStyle } from "@/lib/displayShape";
import { useLit } from "@/i18n/literal";
import { useHabit } from "./habitCtx";
import { Marquee, WidgetFrame } from "./core";
import { useWT } from "./wt";

/** Dois estilos, só o fundo muda: branco e preto. */
const SKINS: Record<string, { bg: string; ink: string; sub: string; accent: string; off: string; onAccent: string }> = {
  light: { bg: "#ffffff", ink: "#111111", sub: "#6b6b6b", accent: "#f76707", off: "#e6e6e6", onAccent: "#ffffff" },
  dark: { bg: "#0f0f10", ink: "#ffffff", sub: "rgba(255,255,255,.6)", accent: "#ff922b", off: "rgba(255,255,255,.16)", onAccent: "#1a1209" },
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const back = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - n);

/** Hoje, no aparelho de quem vê (null até a tela montar); confere a cada minuto, então vira sozinho à meia-noite. */
function useToday(): Date | null {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
    const t = window.setInterval(() => setToday(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return today;
}

/** Dias seguidos até hoje (ou até ontem, se hoje ainda não foi marcado: a sequência só quebra quando passa um dia inteiro sem marcar). */
export function streakOf(days: Set<string>, today: Date): number {
  let cursor = days.has(iso(today)) ? 0 : 1;
  let n = 0;
  while (days.has(iso(back(today, cursor)))) {
    n++;
    cursor++;
  }
  return n;
}

/**
 * Meta de hábito: o nome, o emoji e quantos dias seguidos a pessoa cumpriu, com os últimos 7 dias marcados.
 * O dono marca (ou desmarca) o dia de hoje no próprio cartão.
 */
export function HabitWidget({ style = "light", title, emoji, days, badgeId, frame }: { style?: string; title?: string; emoji?: string; days?: string[]; badgeId?: string; frame?: string | null }) {
  const tl = useLit();
  const wt = useWT();
  const { canMark, check } = useHabit();
  const today = useToday();
  const [busy, setBusy] = useState(false);
  const shape = shapeOfStyle(style);
  const square = shape === "square";
  const sk = SKINS[baseStyle(style)] ?? SKINS.light;
  const set = new Set(days ?? []);
  const n = today ? streakOf(set, today) : 0;
  const doneToday = !!today && set.has(iso(today));
  const name = (title ?? "").trim();
  const week = today ? Array.from({ length: 7 }, (_, i) => back(today, 6 - i)) : [];
  const mark = canMark && !!badgeId;
  const icon = (emoji ?? "").trim() || "🔥";

  async function toggle(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    if (!badgeId || busy) return;
    setBusy(true);
    await check(badgeId);
    setBusy(false);
  }
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  const dots = (
    <div className="flex items-end justify-center gap-[0.45em]" aria-hidden>
      {week.map((d) => {
        const on = set.has(iso(d));
        return (
          <span key={iso(d)} className="flex flex-col items-center gap-[0.15em]">
            <span className="size-[1.15em] rounded-full" style={{ background: on ? sk.accent : sk.off, boxShadow: iso(d) === iso(today!) ? `0 0 0 0.12em ${sk.sub}` : undefined }} />
            <span className="text-[0.7em] leading-none font-semibold" style={{ color: sk.sub }}>
              {wt.weekInitials[d.getDay()]}
            </span>
          </span>
        );
      })}
    </div>
  );
  const button = mark && today && (
    <button type="button" onPointerDown={stop} onClick={toggle} disabled={busy} className="cursor-pointer rounded-full px-[0.9em] py-[0.25em] text-[0.85em] leading-tight font-bold disabled:opacity-60" style={doneToday ? { background: sk.off, color: sk.ink } : { background: sk.accent, color: sk.onAccent }}>
      {doneToday ? `✓ ${tl("Feito hoje")}` : tl("Marcar hoje")}
    </button>
  );
  const count = (
    <span className="leading-none font-extrabold tabular-nums" style={{ fontSize: square ? "3.8em" : "3.6em", color: sk.accent }}>
      {n}
    </span>
  );
  const unit = <span className="text-[1.15em] leading-tight font-bold">{n === 1 ? wt.day : wt.days}</span>;

  return (
    <WidgetFrame frame={frame} label={tl("Meta de hábito")} shape={shape}>
      <div className={`absolute inset-0 flex ${square ? "flex-col items-center px-[0.9em] pt-[0.9em] pb-[0.8em] text-center" : "items-center gap-[1em] px-[1.2em] py-[0.9em]"}`} style={{ background: sk.bg, color: sk.ink }}>
        {square ? (
          <>
            <div className="flex w-full items-center justify-center gap-[0.35em]">
              <span className="text-[1.4em] leading-none">{icon}</span>
              {name ? <Marquee text={name} className="min-w-0 text-[1.2em] leading-tight font-bold" /> : null}
            </div>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
              {count}
              {unit}
            </div>
            {button || dots}
          </>
        ) : (
          <>
            <div className="flex shrink-0 flex-col items-center">
              <span className="text-[2.2em] leading-none">{icon}</span>
              <div className="mt-[0.15em] flex items-baseline gap-[0.3em]">
                {count}
              </div>
              {unit}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-[0.55em]">
              {name && (
                <p className="truncate text-[1.45em] leading-tight font-bold" title={name}>
                  {name}
                </p>
              )}
              {dots}
              {button && <div className="flex justify-center">{button}</div>}
            </div>
          </>
        )}
      </div>
    </WidgetFrame>
  );
}
