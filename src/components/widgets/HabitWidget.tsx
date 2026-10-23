"use client";

import { useEffect, useState } from "react";
import { baseStyle, shapeOfStyle } from "@/lib/displayShape";
import { useLit } from "@/i18n/literal";
import { useHabit } from "./habitCtx";
import { WidgetFrame } from "./core";
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
 * Meta de hábito: o nome, quantos dias seguidos a pessoa cumpriu (só o número) e os últimos 7 dias marcados.
 * O dono marca (ou desmarca) o dia de hoje no próprio cartão. Se um dia inteiro passa sem marcar, a sequência volta a zero na virada do dia.
 */
export function HabitWidget({ style = "light", title, days, badgeId, frame }: { style?: string; title?: string; emoji?: string; days?: string[]; badgeId?: string; frame?: string | null }) {
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
  const mark = canMark && !!badgeId && !!today;

  async function toggle(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    if (!badgeId || busy) return;
    setBusy(true);
    await check(badgeId);
    setBusy(false);
  }
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  const dots = (
    <div className="flex items-start justify-center gap-[0.5em]" aria-hidden>
      {week.map((d) => {
        const on = set.has(iso(d));
        return (
          <span key={iso(d)} className="flex flex-col items-center gap-[0.2em]">
            <span className="size-[1em] rounded-full" style={{ background: on ? sk.accent : sk.off }} />
            <span className="text-[0.65em] leading-none font-semibold" style={{ color: sk.sub }}>
              {wt.weekInitials[d.getDay()]}
            </span>
          </span>
        );
      })}
    </div>
  );
  const button = mark && (
    <button type="button" onPointerDown={stop} onClick={toggle} disabled={busy} className="cursor-pointer rounded-full px-[1em] py-[0.3em] text-[0.85em] leading-tight font-bold whitespace-nowrap disabled:opacity-60" style={doneToday ? { background: sk.off, color: sk.ink } : { background: sk.accent, color: sk.onAccent }}>
      {doneToday ? `✓ ${tl("Feito hoje")}` : tl("Marcar hoje")}
    </button>
  );

  return (
    <WidgetFrame frame={frame} label={tl("Meta de hábito")} shape={shape}>
      <div className={`absolute inset-0 flex ${square ? "flex-col items-center justify-between gap-[0.3em] px-[0.9em] py-[0.8em] text-center" : "items-center gap-[1.4em] px-[1.5em] py-[1em]"}`} style={{ background: sk.bg, color: sk.ink }}>
        {square ? (
          <>
            {name ? <p className="w-full truncate text-[1.2em] leading-tight font-bold">{name}</p> : <span />}
            <div className="flex flex-col items-center">
              <span className="leading-[0.95] font-extrabold tabular-nums" style={{ fontSize: n >= 100 ? "3em" : "3.6em", color: sk.accent }}>
                {n}
              </span>
              <span className="text-[1.1em] leading-tight font-bold">{n === 1 ? wt.day : wt.days}</span>
            </div>
            <div className="flex flex-col items-center gap-[0.45em]">
              {dots}
              {button}
            </div>
          </>
        ) : (
          <>
            <div className="flex w-[7em] shrink-0 flex-col items-center">
              <span className="leading-[0.95] font-extrabold tabular-nums" style={{ fontSize: n >= 100 ? "4.2em" : "5.2em", color: sk.accent }}>
                {n}
              </span>
              <span className="mt-[0.15em] text-[1.2em] leading-tight font-bold">{n === 1 ? wt.day : wt.days}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-[0.7em]">
              {name && (
                <p className="truncate text-[1.5em] leading-tight font-bold" title={name}>
                  {name}
                </p>
              )}
              {dots}
              {button && <div className="flex">{button}</div>}
            </div>
          </>
        )}
      </div>
    </WidgetFrame>
  );
}
