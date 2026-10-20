"use client";

import { useEffect, useState } from "react";
import { baseStyle, shapeOfStyle } from "@/lib/displayShape";
import { WidgetFrame } from "./core";
import { SHARED_SKINS, type Skin } from "./skins";
import { useTranslations } from "next-intl";

/** Uma data importante marcada no calendário. `yearly`: repete todo ano (aniversário, Natal…). */
export type CalDate = { date: string; label: string; yearly: boolean };

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const parts = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m: m - 1, d };
};

/** Hoje, no aparelho de quem está vendo (null até a tela montar, para não divergir do servidor). */
function useToday() {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
    const t = window.setInterval(() => setToday(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return today;
}

/** A próxima vez que a data cai (hoje ou depois); datas sem repetição que já passaram ficam de fora. */
function nextOf(c: CalDate, today: Date): Date | null {
  const { y, m, d } = parts(c.date);
  const t0 = startOfDay(today);
  if (!c.yearly) {
    const once = new Date(y, m, d);
    return once >= t0 ? once : null;
  }
  const n = new Date(t0.getFullYear(), m, d);
  return n >= t0 ? n : new Date(t0.getFullYear() + 1, m, d);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Estilos do calendário: parede (papel) e moderno (escuro) são os de origem; os outros vêm dos estilos compartilhados. */
const SKINS: Record<string, Skin> = {
  paper: { bg: "linear-gradient(145deg,#fdf8ec,#f1e5c8)", ink: "#2f2218", sub: "rgba(47,34,24,.55)", num: "#2f2218", box: "transparent", edge: "rgba(47,34,24,.15)", glow: "none", accent: "#d9453a", onAccent: "#ffffff" },
  modern: { bg: "linear-gradient(145deg,#1b2433,#0d121b)", ink: "#eef2f7", sub: "rgba(238,242,247,.55)", num: "#eef2f7", box: "transparent", edge: "rgba(255,255,255,.12)", glow: "none", accent: "#5cc4ff", onAccent: "#08202e" },
  mint: SHARED_SKINS.mint,
  rose: SHARED_SKINS.rose,
  mono: SHARED_SKINS.mono,
};

/**
 * Calendário: o mês de hoje (no aparelho de quem vê) com as datas importantes do dono marcadas. No formato retangular, as próximas datas ficam ao lado.
 * Cinco estilos, em formato retangular ou quadrado.
 */
export function CalendarWidget({ style = "paper", dates, frame }: { style?: string; dates?: CalDate[]; frame?: string | null }) {
  const tx = useTranslations("components.widgets.CalendarWidget");
  const today = useToday();
  const shape = shapeOfStyle(style);
  const square = shape === "square";
  const sk = SKINS[baseStyle(style)] ?? SKINS.paper;
  const list = dates ?? [];
  const now = today ?? new Date(2026, 0, 15); // até montar: um mês qualquer, sem destaque
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const marks = new Map<number, string>();
  for (const c of list) {
    const p = parts(c.date);
    if (p.m === month && (c.yearly || p.y === year)) marks.set(p.d, c.label);
  }
  const upcoming = today
    ? list
        .map((c) => ({ c, at: nextOf(c, today) }))
        .filter((x): x is { c: CalDate; at: Date } => !!x.at)
        .sort((a, b) => a.at.getTime() - b.at.getTime())
        .slice(0, 4)
    : [];
  const { ink, sub: soft, accent, onAccent } = sk;
  const cells: (number | null)[] = [...Array.from({ length: first }, () => null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const rows = Math.ceil(cells.length / 7);

  const monthPane = (
    <div className={`flex min-w-0 flex-col ${square ? "flex-1 px-[0.9em] pt-[0.85em] pb-[0.6em]" : "flex-[1.55] px-[0.9em] pt-[0.7em] pb-[0.5em]"}`}>
      <div className="flex items-baseline justify-between leading-none">
        <span className={`font-bold tracking-wide uppercase ${square ? "text-[1.45em]" : "text-[1.25em]"}`} style={{ color: accent }}>
          {MONTHS[month]}
        </span>
        <span className="text-[0.85em] font-semibold" style={{ color: soft }}>
          {year}
        </span>
      </div>
      <div className={`grid grid-cols-7 text-center font-bold ${square ? "mt-[0.6em] text-[0.7em]" : "mt-[0.45em] text-[0.62em]"}`} style={{ color: soft }}>
        {WEEK.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className={`mt-[0.15em] grid grid-cols-7 content-start text-center leading-none ${square ? "flex-1 text-[0.82em]" : "flex-1 text-[0.78em]"}`} style={{ gridAutoRows: square ? `${rows > 5 ? 1.5 : 1.75}em` : "1.42em" }}>
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const marked = marks.has(d);
          const isToday = !!today && d === today.getDate();
          return (
            <span key={d} className="grid place-items-center">
              <span
                title={marked ? marks.get(d) : undefined}
                className={`grid place-items-center rounded-full font-semibold ${square ? "size-[1.55em]" : "size-[1.45em]"}`}
                style={{
                  background: marked ? accent : "transparent",
                  color: marked ? onAccent : ink,
                  boxShadow: isToday ? `inset 0 0 0 0.12em ${marked ? onAccent : ink}` : undefined,
                }}
              >
                {d}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );

  return (
    <WidgetFrame frame={frame} label={tx("calendario")} shape={shape}>
      <div className="absolute inset-0 flex" style={{ background: sk.bg, color: ink }}>
        {monthPane}
        {/* próximas datas (só no retangular) */}
        {!square && (
          <div className="flex min-w-0 flex-1 flex-col border-l px-[0.8em] pt-[0.8em] pb-[0.5em]" style={{ borderColor: sk.edge }}>
            <p className="text-[0.62em] font-bold tracking-wider uppercase" style={{ color: soft }}>
              {tx("datasMarcadas")}</p>
            {upcoming.length === 0 ? (
              <p className="mt-[0.8em] text-[0.8em] leading-snug" style={{ color: soft }}>
                {tx("nenhumaDataMarcada")}</p>
            ) : (
              <ul className="mt-[0.5em] space-y-[0.45em]">
                {upcoming.map(({ c, at }) => (
                  <li key={c.date + c.label} className="flex items-baseline gap-[0.5em] leading-tight">
                    <span className="shrink-0 text-[0.85em] font-bold" style={{ color: accent }}>
                      {pad(at.getDate())}/{pad(at.getMonth() + 1)}
                    </span>
                    <span className="min-w-0 truncate text-[0.8em]">{c.label || "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </WidgetFrame>
  );
}
