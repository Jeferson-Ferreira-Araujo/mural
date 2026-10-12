"use client";

import { useEffect, useState } from "react";
import { WidgetFrame } from "./core";

/** Hoje, no aparelho de quem vê (null até a tela montar, para não divergir do servidor); confere a cada minuto, então vira sozinho à meia-noite. */
function useToday(): Date | null {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
    const t = window.setInterval(() => setToday(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return today;
}

const dayOf = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 86_400_000;

/**
 * Contador de dias: quantos dias já se passaram desde uma data (tempo juntos, sem fumar, de casa nova…), com o nome e a data de início.
 * Se a data ainda não chegou, mostra quantos dias faltam para começar. Dois estilos: quente (claro) e entardecer (cores fortes).
 */
export function DaysWidget({ style = "warm", title, since, frame }: { style?: string; title?: string; since?: string; frame?: string | null }) {
  const today = useToday();
  const dusk = style === "dusk";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(since ?? "");
  const name = (title ?? "").trim() || "Nosso tempo";

  let n = 0;
  let future = false;
  if (m && today) {
    const diff = dayOf(today.getFullYear(), today.getMonth() + 1, today.getDate()) - dayOf(Number(m[1]), Number(m[2]), Number(m[3]));
    future = diff < 0;
    n = Math.abs(diff);
  }
  const label = future ? (n === 1 ? "dia para começar" : "dias para começar") : n === 1 ? "dia" : "dias";
  const from = m ? `${m[3]}/${m[2]}/${m[1]}` : "";
  const size = String(n).length >= 5 ? 3.6 : String(n).length === 4 ? 4.4 : 5.4;

  const skin = dusk
    ? { bg: "linear-gradient(155deg,#2c2160,#8a3f7a 55%,#ee8a6a)", ink: "#ffffff", sub: "rgba(255,255,255,.82)", num: "#ffe9b8", glow: "0 0.05em 0.35em rgba(40,10,60,.45)" }
    : { bg: "linear-gradient(155deg,#fff4dc,#f7cf92)", ink: "#3b2616", sub: "#7a5530", num: "#b5471f", glow: "none" };

  return (
    <WidgetFrame frame={frame} label="Contador de dias">
      <div className="absolute inset-0 flex flex-col items-center px-[1.3em] pt-[0.9em] pb-[0.8em] text-center" style={{ background: skin.bg, color: skin.ink }}>
        <p className="w-full truncate text-[1.45em] leading-tight font-bold" title={name}>
          {name}
        </p>
        <div className="flex min-h-0 flex-1 items-baseline justify-center gap-[0.3em] pt-[0.1em]">
          <span className="self-center leading-none font-extrabold tabular-nums" style={{ fontSize: `${size}em`, color: skin.num, textShadow: skin.glow }}>
            {n}
          </span>
          <span className="self-center text-[1.5em] leading-tight font-bold" style={{ color: skin.ink }}>
            {label}
          </span>
        </div>
        {from && (
          <p className="text-[0.95em] font-semibold" style={{ color: skin.sub }}>
            {future ? "começa em" : "desde"} {from}
          </p>
        )}
      </div>
    </WidgetFrame>
  );
}
