"use client";

import { useEffect, useState } from "react";
import { baseStyle } from "@/lib/displayShape";
import { useLit } from "@/i18n/literal";
import { useHabit } from "./habitCtx";
import { WidgetFrame } from "./core";
import { useWT } from "./wt";

type Tone = { box: string; num: string };
type Skin = { bg: string; ink: string; sub: string; off: string; ring: string; wait: Tone; ok: Tone; fail: Tone; done: string; today: string; onSolid: string };

/** Dois estilos, só o fundo muda (branco e preto). As cores contam a história: azul = em andamento, verde = hoje cumprido, vermelho = a sequência foi perdida. */
const SKINS: Record<string, Skin> = {
  light: {
    bg: "#ffffff", ink: "#16181d", sub: "#6b7280", off: "#e5e7eb", ring: "#cbd0d8",
    wait: { box: "#dbeafe", num: "#1d4ed8" }, ok: { box: "#dcf3e3", num: "#157a3c" }, fail: { box: "#ffe1e1", num: "#c42b2b" },
    done: "#1f9d55", today: "#1d6fe0", onSolid: "#ffffff",
  },
  dark: {
    bg: "#0f1115", ink: "#f4f5f7", sub: "rgba(244,245,247,.58)", off: "rgba(255,255,255,.14)", ring: "rgba(255,255,255,.28)",
    wait: { box: "rgba(59,130,246,.2)", num: "#7db4ff" }, ok: { box: "rgba(34,197,94,.2)", num: "#5fe08d" }, fail: { box: "rgba(239,68,68,.22)", num: "#ff8585" },
    done: "#22b862", today: "#3b82f6", onSolid: "#ffffff",
  },
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

/** Dias seguidos até hoje (ou até ontem, se hoje ainda não foi marcado: a sequência só quebra quando um dia inteiro passa sem marcar, na virada do dia). */
export function streakOf(days: Set<string>, today: Date): number {
  let cursor = days.has(iso(today)) ? 0 : 1;
  let n = 0;
  while (days.has(iso(back(today, cursor)))) {
    n++;
    cursor++;
  }
  return n;
}

const Check = ({ color, size = "0.7em" }: { color: string; size?: string }) => (
  <svg viewBox="0 0 24 24" style={{ width: size, height: size }} fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/**
 * Meta de hábito (só quadrado): nome e descrição, quantos dias seguidos (só o número, em uma caixa colorida) e a semana com os dias cumpridos.
 * O dono marca (ou desmarca) hoje no próprio cartão. Se um dia inteiro passa sem marcar, a sequência volta a zero na virada do dia.
 * Cores: azul (em andamento), verde (hoje cumprido) e vermelho (sequência perdida).
 */
export function HabitWidget({ style = "q-light", title, note, days, badgeId, frame }: { style?: string; title?: string; note?: string; days?: string[]; badgeId?: string; frame?: string | null }) {
  const tl = useLit();
  const wt = useWT();
  const { canMark, check } = useHabit();
  const today = useToday();
  const [busy, setBusy] = useState(false);
  const sk = SKINS[baseStyle(style)] ?? SKINS.light;
  const set = new Set(days ?? []);
  const n = today ? streakOf(set, today) : 0;
  const doneToday = !!today && set.has(iso(today));
  const lost = !!today && n === 0 && !doneToday && set.size > 0;
  const tone = doneToday ? sk.ok : lost ? sk.fail : sk.wait;
  const name = (title ?? "").trim();
  const sub = (note ?? "").trim();
  // a semana de hoje, de domingo a sábado
  const week = today ? Array.from({ length: 7 }, (_, i) => back(today, today.getDay() - i)) : [];
  const mark = canMark && !!badgeId && !!today;
  const label = n === 1 ? tl("dia seguido") : tl("dias seguidos");

  async function toggle(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    if (!badgeId || busy) return;
    setBusy(true);
    await check(badgeId);
    setBusy(false);
  }
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <WidgetFrame frame={frame} label={tl("Meta de hábito")} shape="square">
      <div className="absolute inset-0 flex flex-col justify-between gap-[0.35em] px-[0.9em] py-[0.8em]" style={{ background: sk.bg, color: sk.ink }}>
        <div className="min-w-0">
          <p className="truncate text-[1.2em] leading-tight font-bold" title={name}>
            {name || wt.defTogether}
          </p>
          {sub && (
            <p className="truncate text-[0.78em] leading-tight" style={{ color: sk.sub }} title={sub}>
              {sub}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center rounded-[0.7em] px-[0.5em] py-[0.35em]" style={{ background: tone.box, color: tone.num }}>
          <span className="leading-none font-extrabold tabular-nums" style={{ fontSize: n >= 100 ? "2.2em" : "2.6em" }}>
            {n}
          </span>
          <span className="text-[0.8em] leading-tight font-semibold" style={{ color: sk.ink }}>
            {label}
          </span>
        </div>

        <div className="flex justify-between" aria-hidden>
          {week.map((d, i) => {
            const k = iso(d);
            const on = set.has(k);
            const isToday = k === iso(today!);
            const future = d > today! && !isToday;
            return (
              <span key={k} className="flex w-[1.3em] flex-col items-center gap-[0.2em]">
                <span className="grid h-[1.05em] min-w-[1.05em] place-items-center rounded-full px-[0.2em] text-[0.62em] leading-none font-bold" style={isToday ? { background: sk.today, color: sk.onSolid } : { color: sk.sub }}>
                  {wt.weekInitials[i]}
                </span>
                <span className="grid size-[1.05em] place-items-center rounded-full" style={on ? { background: sk.done } : { boxShadow: `inset 0 0 0 0.1em ${isToday ? sk.today : sk.ring}`, opacity: future ? 0.55 : 1 }}>
                  {on && <Check color={sk.onSolid} />}
                </span>
              </span>
            );
          })}
        </div>

        {mark && (
          <button type="button" onPointerDown={stop} onClick={toggle} disabled={busy} className="flex w-full cursor-pointer items-center justify-center gap-[0.35em] rounded-[0.6em] px-[0.6em] py-[0.32em] text-[0.85em] leading-tight font-bold whitespace-nowrap disabled:opacity-60" style={doneToday ? { background: sk.ok.box, color: sk.ok.num } : { background: sk.today, color: sk.onSolid }}>
            <Check color={doneToday ? sk.ok.num : sk.onSolid} size="0.9em" />
            {doneToday ? tl("Hábito concluído hoje!") : tl("Marcar hoje")}
          </button>
        )}
      </div>
    </WidgetFrame>
  );
}
