"use client";

import { useEffect, useState } from "react";
import { baseStyle, shapeOfStyle } from "@/lib/displayShape";
import { Marquee, WidgetFrame } from "./core";
import { SHARED_SKINS, type Skin } from "./skins";
import { useTranslations } from "next-intl";

/** Estilos do contador de dias: quente e entardecer são os de origem; os outros vêm dos estilos compartilhados. */
const SKINS: Record<string, Skin> = {
  warm: { bg: "linear-gradient(155deg,#fff4dc,#f7cf92)", ink: "#3b2616", sub: "#7a5530", num: "#b5471f", box: "rgba(255,255,255,.6)", edge: "rgba(120,80,20,.2)", glow: "none", accent: "#b5471f", onAccent: "#ffffff" },
  dusk: SHARED_SKINS.dusk,
  mint: SHARED_SKINS.mint,
  night: SHARED_SKINS.night,
  mono: SHARED_SKINS.mono,
};

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
 * Se a data ainda não chegou, mostra quantos dias faltam para começar. Cinco estilos, em formato retangular ou quadrado.
 */
export function DaysWidget({ style = "warm", title, since, frame }: { style?: string; title?: string; since?: string; frame?: string | null }) {
  const tx = useTranslations("components.widgets.DaysWidget");
  const today = useToday();
  const shape = shapeOfStyle(style);
  const square = shape === "square";
  const skin = SKINS[baseStyle(style)] ?? SKINS.warm;
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
  const len = String(n).length;
  const size = square ? (len >= 5 ? 3.3 : len === 4 ? 4.1 : len === 3 ? 5 : 6.2) : len >= 5 ? 3.6 : len === 4 ? 4.4 : 5.4;

  return (
    <WidgetFrame frame={frame} label={tx("contadorDeDias")} shape={shape}>
      <div className={`absolute inset-0 flex flex-col items-center text-center ${square ? "px-[1em] pt-[1.1em] pb-[1em]" : "px-[1.3em] pt-[0.9em] pb-[0.8em]"}`} style={{ background: skin.bg, color: skin.ink }}>
        {square ? (
          <Marquee text={name} className="text-[1.4em] leading-tight font-bold" />
        ) : (
          <p className="w-full truncate text-[1.45em] leading-tight font-bold" title={name}>
            {name}
          </p>
        )}
        {square ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
            <span className="leading-none font-extrabold tabular-nums" style={{ fontSize: `${size}em`, color: skin.num, textShadow: skin.glow }}>
              {n}
            </span>
            <span className="mt-[0.2em] text-[1.3em] leading-tight font-bold">{label}</span>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-baseline justify-center gap-[0.3em] pt-[0.1em]">
            <span className="self-center leading-none font-extrabold tabular-nums" style={{ fontSize: `${size}em`, color: skin.num, textShadow: skin.glow }}>
              {n}
            </span>
            <span className="self-center text-[1.5em] leading-tight font-bold">{label}</span>
          </div>
        )}
        {from && (
          <p className="text-[0.95em] font-semibold" style={{ color: skin.sub }}>
            {future ? "começa em" : "desde"} {from}
          </p>
        )}
      </div>
    </WidgetFrame>
  );
}
