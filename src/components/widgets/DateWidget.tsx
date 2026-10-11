"use client";

import { useEffect, useState } from "react";
import { WidgetFrame } from "./core";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

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
 * Calendário do dia: só a data de hoje, grande. Dois estilos: folha (papel com a faixa vermelha) e noite (escuro e limpo).
 */
export function DateWidget({ style = "page", frame }: { style?: string; frame?: string | null }) {
  const today = useToday();
  const d = today ?? new Date(2026, 0, 15); // até montar: uma data qualquer
  const night = style === "night";
  const day = String(d.getDate());
  const weekday = WEEKDAYS[d.getDay()];
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();

  if (night) {
    return (
      <WidgetFrame frame={frame} label="Calendário do dia">
        <div className="absolute inset-0 flex items-center justify-center gap-[1.6em] px-[1.6em]" style={{ background: "linear-gradient(145deg,#1b2433,#0b1018)", color: "#eef2f7" }}>
          <span className="text-[6.2em] leading-none font-semibold tabular-nums" style={{ color: "#5cc4ff", textShadow: "0 0.04em 0.3em rgba(92,196,255,.35)" }}>
            {day}
          </span>
          <div className="min-w-0 border-l pl-[1.3em] leading-tight" style={{ borderColor: "rgba(255,255,255,.18)" }}>
            <p className="text-[1.45em] font-semibold capitalize">{weekday.replace("-feira", "")}</p>
            <p className="mt-[0.1em] text-[1.15em] capitalize opacity-80">{month}</p>
            <p className="mt-[0.1em] text-[0.95em] opacity-55">{year}</p>
          </div>
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame frame={frame} label="Calendário do dia">
      <div className="absolute inset-0 flex flex-col" style={{ background: "linear-gradient(160deg,#fffaf0,#f1e4c6)", color: "#2f2218" }}>
        {/* faixa do mês, como na folha de um calendário de parede */}
        <div className="flex shrink-0 items-center justify-between px-[1.4em] py-[0.55em]" style={{ background: "linear-gradient(180deg,#e0524a,#c33a32)", color: "#fff" }}>
          <span className="text-[1.25em] font-bold tracking-wide uppercase">{month}</span>
          <span className="text-[1em] font-semibold opacity-90">{year}</span>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center gap-[1.6em] px-[1.4em]">
          {/* furinhos da espiral */}
          <span aria-hidden className="absolute top-[-0.55em] left-[28%] size-[1.1em] rounded-full" style={{ background: "#3a2a1a" }} />
          <span aria-hidden className="absolute top-[-0.55em] right-[28%] size-[1.1em] rounded-full" style={{ background: "#3a2a1a" }} />
          <span className="text-[6.4em] leading-none font-bold tabular-nums" style={{ color: "#c33a32" }}>
            {day}
          </span>
          <p className="text-[1.6em] leading-tight font-semibold capitalize" style={{ color: "#4a3826" }}>
            {weekday.replace("-feira", "")}
          </p>
        </div>
      </div>
    </WidgetFrame>
  );
}
