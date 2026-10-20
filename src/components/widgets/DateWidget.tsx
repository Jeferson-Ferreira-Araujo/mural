"use client";

import { useEffect, useState } from "react";
import { baseStyle, shapeOfStyle } from "@/lib/displayShape";
import { WidgetFrame } from "./core";
import { SHARED_SKINS, type Skin } from "./skins";
import { useTranslations } from "next-intl";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/** Estilos do calendário do dia: folha e noite são os de origem; os outros vêm dos estilos compartilhados. */
const SKINS: Record<string, Skin> = {
  page: { bg: "linear-gradient(160deg,#fffaf0,#f1e4c6)", ink: "#4a3826", sub: "#4a3826", num: "#c33a32", box: "transparent", edge: "transparent", glow: "none", accent: "#c33a32", onAccent: "#ffffff" },
  night: SHARED_SKINS.night,
  mint: SHARED_SKINS.mint,
  rose: SHARED_SKINS.rose,
  mono: SHARED_SKINS.mono,
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

/**
 * Calendário do dia: só a data de hoje, grande. Cinco estilos, em formato retangular ou quadrado.
 * Os dois de origem no retangular (folha e noite) têm o desenho próprio de sempre; os demais usam o desenho comum com faixa do mês.
 */
export function DateWidget({ style = "page", frame }: { style?: string; frame?: string | null }) {
  const tx = useTranslations("components.widgets.DateWidget");
  const today = useToday();
  const shape = shapeOfStyle(style);
  const square = shape === "square";
  const base = baseStyle(style);
  const d = today ?? new Date(2026, 0, 15); // até montar: uma data qualquer
  const day = String(d.getDate());
  const weekday = WEEKDAYS[d.getDay()];
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const wd = weekday.replace("-feira", "");

  // desenhos de origem (só no retangular)
  if (!square && base === "night") {
    return (
      <WidgetFrame frame={frame} label={tx("calendarioDoDia")}>
        <div className="absolute inset-0 flex items-center justify-center gap-[1.6em] px-[1.6em]" style={{ background: "linear-gradient(145deg,#1b2433,#0b1018)", color: "#eef2f7" }}>
          <span className="text-[6.2em] leading-none font-semibold tabular-nums" style={{ color: "#5cc4ff", textShadow: "0 0.04em 0.3em rgba(92,196,255,.35)" }}>
            {day}
          </span>
          <div className="min-w-0 border-l pl-[1.3em] leading-tight" style={{ borderColor: "rgba(255,255,255,.18)" }}>
            <p className="text-[1.45em] font-semibold capitalize">{wd}</p>
            <p className="mt-[0.1em] text-[1.15em] capitalize opacity-80">{month}</p>
            <p className="mt-[0.1em] text-[0.95em] opacity-55">{year}</p>
          </div>
        </div>
      </WidgetFrame>
    );
  }

  const sk = SKINS[base] ?? SKINS.page;
  const page = base === "page";

  // desenho comum: faixa do mês em cima e o dia grande (ao lado do dia da semana no retangular; embaixo no quadrado)
  return (
    <WidgetFrame frame={frame} label={tx("calendarioDoDia")} shape={shape}>
      <div className="absolute inset-0 flex flex-col" style={{ background: sk.bg, color: sk.ink }}>
        {/* faixa do mês, como na folha de um calendário de parede */}
        <div className={`flex shrink-0 items-center justify-between ${square ? "px-[1em] py-[0.6em]" : "px-[1.4em] py-[0.55em]"}`} style={{ background: page ? "linear-gradient(180deg,#e0524a,#c33a32)" : sk.accent, color: page ? "#fff" : sk.onAccent }}>
          <span className={`font-bold tracking-wide uppercase ${square ? "text-[1.15em]" : "text-[1.25em]"}`}>{month}</span>
          <span className="text-[1em] font-semibold opacity-90">{year}</span>
        </div>
        {square ? (
          <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center">
            {page && (
              <>
                <span aria-hidden className="absolute top-[-0.55em] left-[28%] size-[1.1em] rounded-full" style={{ background: "#3a2a1a" }} />
                <span aria-hidden className="absolute top-[-0.55em] right-[28%] size-[1.1em] rounded-full" style={{ background: "#3a2a1a" }} />
              </>
            )}
            <span className="leading-none font-bold tabular-nums" style={{ fontSize: "5.6em", color: sk.num, textShadow: sk.glow }}>
              {day}
            </span>
            <span className="mt-[0.15em] text-[1.45em] leading-tight font-semibold capitalize" style={{ color: sk.sub }}>
              {wd}
            </span>
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 items-center justify-center gap-[1.6em] px-[1.4em]">
            {page && (
              <>
                <span aria-hidden className="absolute top-[-0.55em] left-[28%] size-[1.1em] rounded-full" style={{ background: "#3a2a1a" }} />
                <span aria-hidden className="absolute top-[-0.55em] right-[28%] size-[1.1em] rounded-full" style={{ background: "#3a2a1a" }} />
              </>
            )}
            <span className="leading-none font-bold tabular-nums" style={{ fontSize: "6.4em", color: sk.num, textShadow: sk.glow }}>
              {day}
            </span>
            <p className="text-[1.6em] leading-tight font-semibold capitalize" style={{ color: sk.sub }}>
              {wd}
            </p>
          </div>
        )}
      </div>
    </WidgetFrame>
  );
}
