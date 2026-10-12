"use client";

import { useEffect, useState } from "react";
import { baseStyle, shapeOfStyle } from "@/lib/displayShape";
import { WidgetFrame } from "./core";
import { SHARED_SKINS, type Skin } from "./skins";

const pad = (n: number) => String(n).padStart(2, "0");

/** Estilos do contador regressivo: neon e claro são os de origem; os outros vêm dos estilos compartilhados. */
const SKINS: Record<string, Skin> = {
  neon: { bg: "linear-gradient(150deg,#101733,#070b1a)", ink: "#eaf1ff", sub: "#8fa3d6", num: "#6fe3ff", box: "rgba(255,255,255,.06)", edge: "rgba(111,227,255,.28)", glow: "0 0 0.5em rgba(111,227,255,.55)", accent: "#ff6ad5", onAccent: "#ffffff" },
  light: { bg: "linear-gradient(160deg,#fffaf0,#f1e4c6)", ink: "#2f2218", sub: "#6b5440", num: "#2f2218", box: "rgba(255,255,255,.7)", edge: "rgba(120,80,20,.22)", glow: "none", accent: "#c33a32", onAccent: "#ffffff" },
  dusk: SHARED_SKINS.dusk,
  mint: SHARED_SKINS.mint,
  mono: SHARED_SKINS.mono,
};

/** O alvo (data e hora marcadas) no relógio do aparelho de quem vê. Entrada inválida vira null. */
function targetOf(date?: string, time?: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? "");
  if (!m) return null;
  const [hh, mm] = /^\d{2}:\d{2}$/.test(time ?? "") ? (time as string).split(":").map(Number) : [0, 0];
  const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hh, mm, 0);
  return Number.isNaN(t.getTime()) ? null : t;
}

/** Agora, atualizado a cada segundo (null até a tela montar, para não divergir do servidor). */
function useTick(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

/**
 * Contador regressivo até uma data: nome do evento e dias, horas, minutos e segundos que faltam.
 * Chegando a hora mostra "Chegou o dia!"; depois do dia, há quanto tempo foi. Cinco estilos, em formato retangular ou quadrado.
 */
export function CountdownWidget({ style = "neon", title, target, time, frame }: { style?: string; title?: string; target?: string; time?: string; frame?: string | null }) {
  const now = useTick();
  const shape = shapeOfStyle(style);
  const square = shape === "square";
  const skin = SKINS[baseStyle(style)] ?? SKINS.neon;
  const at = targetOf(target, time);
  const name = (title ?? "").trim() || "Seu evento";

  const diff = at && now !== null ? at.getTime() - now : null; // ms (negativo = já passou)
  const arrived = diff !== null && diff <= 0;
  const ago = diff !== null && diff < 0 ? Math.floor(-diff / 86_400_000) : 0;
  const left = diff === null ? 0 : Math.max(0, diff);
  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor(left / 3_600_000) % 24;
  const minutes = Math.floor(left / 60_000) % 60;
  const seconds = Math.floor(left / 1000) % 60;
  const cells: [string, string][] = [
    [String(days), days === 1 ? "dia" : "dias"],
    [pad(hours), "horas"],
    [pad(minutes), "min"],
    [pad(seconds), "seg"],
  ];
  const big = square ? 2.6 : 2.9;

  return (
    <WidgetFrame frame={frame} label="Contador regressivo" shape={shape}>
      <div className={`absolute inset-0 flex flex-col ${square ? "px-[1em] pt-[1em] pb-[1em]" : "px-[1.2em] pt-[0.9em] pb-[1em]"}`} style={{ background: skin.bg, color: skin.ink }}>
        <p className={`truncate text-center leading-tight font-bold ${square ? "text-[1.5em]" : "text-[1.45em]"}`} title={name}>
          {name}
        </p>
        {arrived ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
            <p className={`leading-none font-extrabold ${square ? "text-[2.4em]" : "text-[2.6em]"}`} style={{ color: skin.accent, textShadow: skin.glow }}>
              {ago >= 1 ? "Já passou" : "Chegou o dia!"}
            </p>
            {ago >= 1 && (
              <p className="mt-[0.35em] text-[1.1em] font-semibold" style={{ color: skin.sub }}>
                há {ago} {ago === 1 ? "dia" : "dias"}
              </p>
            )}
          </div>
        ) : (
          <div className={`grid min-h-0 flex-1 gap-[0.5em] ${square ? "grid-cols-2 pt-[0.7em]" : "grid-cols-4 pt-[0.55em]"}`}>
            {cells.map(([n, label], i) => {
              const len = i === 0 ? n.length : 0;
              const size = len >= 4 ? big * 0.66 : len === 3 ? big * 0.83 : big;
              return (
                <div key={label} className="flex min-w-0 flex-col items-center justify-center rounded-[0.6em]" style={{ background: skin.box, boxShadow: `inset 0 0 0 0.06em ${skin.edge}` }}>
                  <span className="leading-none font-extrabold tabular-nums" style={{ fontSize: `${size}em`, color: skin.num, textShadow: skin.glow }}>
                    {n}
                  </span>
                  <span className="mt-[0.25em] text-[0.85em] font-semibold tracking-wide uppercase" style={{ color: skin.sub }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetFrame>
  );
}
