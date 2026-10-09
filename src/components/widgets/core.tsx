"use client";

import { useEffect, useState, type ReactNode } from "react";
import { frameOf } from "@/lib/style";
import { INK, Scene, type SceneId } from "./scenes";

/** Largura de um widget, em em da própria fonte; a altura é a metade (formato 2:1). */
export const WIDGET_W = 24;

/** Moldura metálica colorida (a cor do contorno é escolhida por quem coloca o pin) com o conteúdo por dentro. */
export function WidgetFrame({ frame, label, scene, children }: { frame?: string | null; label: string; scene?: SceneId; children: ReactNode }) {
  const f = frameOf(frame);
  const ink = scene ? INK[scene] : null;
  return (
    <div className="relative" style={{ width: `${WIDGET_W}em` }}>
      <article aria-label={label} className="relative aspect-[2/1] w-full rounded-[1.4em] p-[0.34em]" style={{ background: `linear-gradient(145deg, ${f.from}, ${f.to})`, boxShadow: "0 0.3em 0.8em rgba(30,12,0,.45), inset 0 0.06em 0.14em rgba(255,255,255,.7)" }}>
        <div className="relative size-full overflow-hidden rounded-[1.1em]" style={{ color: ink?.color, textShadow: ink?.shadow, boxShadow: "inset 0 0 0.6em rgba(0,0,0,.35)" }}>
          {scene && (
            <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
              <Scene id={scene} />
            </svg>
          )}
          {children}
        </div>
      </article>
    </div>
  );
}

// ---------- ícones ----------
const base = { viewBox: "0 0 24 24", className: "size-full", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
export const LeafIcon = () => (
  <svg {...base}>
    <path d="M5 19c0-9 6-14 14-14 0 8-5 14-14 14Z" />
    <path d="M5 19c3-4 6-6 9-8" />
  </svg>
);
export const SunIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
  </svg>
);
export const MoonIcon = () => (
  <svg {...base}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
  </svg>
);
export const ClockIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5l3 2" />
  </svg>
);

/** Posição de cada widget no canto: ícone da categoria (esquerda) e sol/lua (direita). */
export const Corner = ({ side, children }: { side: "left" | "right"; children: ReactNode }) => (
  <span className={`absolute top-[0.7em] size-[1.5em] opacity-85 ${side === "left" ? "left-[0.8em]" : "right-[0.8em]"}`}>{children}</span>
);

// ---------- hora ----------
/** Fusos que o dono pode escolher (o servidor aceita só estes) e o nome mostrado. */
export const CLOCK_ZONES: { id: string; label: string }[] = [
  { id: "local", label: "Horário de quem está vendo" },
  { id: "America/Sao_Paulo", label: "Brasília" },
  { id: "America/Manaus", label: "Manaus" },
  { id: "America/Noronha", label: "Fernando de Noronha" },
  { id: "Europe/Lisbon", label: "Lisboa" },
  { id: "Europe/London", label: "Londres" },
  { id: "Europe/Paris", label: "Paris" },
  { id: "America/New_York", label: "Nova York" },
  { id: "America/Los_Angeles", label: "Los Angeles" },
  { id: "Asia/Dubai", label: "Dubai" },
  { id: "Asia/Tokyo", label: "Tóquio" },
  { id: "Australia/Sydney", label: "Sydney" },
];

export type Now = { hh: string; mm: string; hour: number; minute: number; second: number; weekday: string; weekdayShort: string; day: number; monthShort: string };

function partsIn(tz: string, d: Date): Now {
  const zone = tz === "local" ? undefined : tz;
  const get = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { ...opts, timeZone: zone }).format(d);
  const hh = get({ hour: "2-digit", hour12: false }).replace(/\D/g, "").padStart(2, "0").slice(-2);
  const mm = get({ minute: "2-digit" }).padStart(2, "0");
  const second = Number(get({ second: "2-digit" }));
  const clean = (t: string) => t.replace(/\./g, "").replace(/-feira/, "");
  const weekdayShort = clean(get({ weekday: "short" }));
  return { hh, mm, hour: Number(hh) % 24, minute: Number(mm), second, weekday: clean(get({ weekday: "long" })), weekdayShort: weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1), day: Number(get({ day: "numeric" })), monthShort: clean(get({ month: "short" })) };
}

/** A hora do fuso escolhido, atualizada sozinha (null até a tela montar, para não divergir do servidor). */
export function useNow(tz: string, tickMs = 5000): Now | null {
  const zone = CLOCK_ZONES.some((z) => z.id === tz) ? tz : "America/Sao_Paulo";
  const [now, setNow] = useState<Now | null>(null);
  useEffect(() => {
    setNow(partsIn(zone, new Date()));
    const t = window.setInterval(() => setNow(partsIn(zone, new Date())), tickMs);
    return () => window.clearInterval(t);
  }, [zone, tickMs]);
  return now;
}

/** A paisagem acompanha a hora: amanhecer, dia, entardecer e noite. */
export const sceneForHour = (h: number): SceneId => (h >= 5 && h < 8 ? "dawn" : h >= 8 && h < 17 ? "day" : h >= 17 && h < 19 ? "dusk" : "night");
export const isNightHour = (h: number) => h < 5 || h >= 19;

// ---------- clima ----------
export type WeatherNow = { temp: number; symbol: string };

const inflight = new Map<string, Promise<WeatherNow | null>>();
const memo = new Map<string, { at: number; data: WeatherNow }>();

/** Busca o tempo agora (o servidor guarda por 20 minutos); vários widgets da mesma cidade dividem a mesma chamada. */
export function loadWeather(lat: number, lon: number): Promise<WeatherNow | null> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return Promise.resolve(hit.data);
  let p = inflight.get(key);
  if (!p) {
    p = fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      .then((r) => (r.ok ? (r.json() as Promise<WeatherNow>) : null))
      .then((d) => {
        if (d) memo.set(key, { at: Date.now(), data: d });
        return d;
      })
      .catch(() => null)
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

export type WeatherKind = "clear" | "partly" | "cloudy" | "rain" | "snow" | "storm" | "fog";

/** Código do MET Norway (ex.: "partlycloudy_day", "lightrain") → tipo de tempo, texto em português e se é noite. */
export function describe(symbol: string): { kind: WeatherKind; label: string; night: boolean } {
  const night = symbol.endsWith("_night");
  const b = symbol.replace(/_(day|night|polartwilight)$/, "");
  if (b.includes("thunder")) return { kind: "storm", label: "Trovoadas", night };
  if (b.includes("snow")) return { kind: "snow", label: "Neve", night };
  if (b.includes("sleet")) return { kind: "snow", label: "Chuva com neve", night };
  if (b.includes("rain")) return { kind: "rain", label: b.includes("heavy") ? "Chuva forte" : b.includes("light") ? "Chuva fraca" : "Chuva", night };
  if (b === "fog") return { kind: "fog", label: "Neblina", night };
  if (b === "cloudy") return { kind: "cloudy", label: "Nublado", night };
  if (b === "partlycloudy") return { kind: "partly", label: "Parcialmente nublado", night };
  return { kind: "clear", label: night ? "Limpo" : "Ensolarado", night };
}

/** O tempo da cidade (ou um exemplo na prévia, antes de escolher a cidade), atualizado a cada 15 minutos. */
export function useWeather(lat?: number, lon?: number): { now: WeatherNow | null | "error"; sample: boolean } {
  const sample = lat === undefined || lon === undefined || (lat === 0 && lon === 0);
  const [now, setNow] = useState<WeatherNow | null | "error">(null);
  useEffect(() => {
    if (sample || lat === undefined || lon === undefined) return;
    let alive = true;
    const run = () => void loadWeather(lat, lon).then((d) => alive && setNow(d ?? "error"));
    run();
    const t = window.setInterval(run, 15 * 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [lat, lon, sample]);
  return { now: sample ? { temp: 24, symbol: "partlycloudy_day" } : now, sample };
}

/** Desenho do tempo (sol, nuvem, chuva…) para os cantos dos widgets de clima. */
export function WeatherGlyph({ kind, night }: { kind: WeatherKind; night: boolean }) {
  const cloud = <path d="M7 17a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5 4 4 0 0 1 17.5 17Z" fill="currentColor" opacity=".92" />;
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
      {kind === "clear" && (night ? <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" fill="#f4efd6" /> : (
        <>
          <circle cx="12" cy="12" r="4.6" fill="#ffd95a" />
          <g stroke="#ffd95a" strokeWidth="1.6" strokeLinecap="round">
            <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7" />
          </g>
        </>
      ))}
      {kind === "partly" && (
        <>
          {night ? <path d="M14 3.5A5.2 5.2 0 1 0 19 11a4.2 4.2 0 0 1-5-7.5Z" fill="#f4efd6" /> : <circle cx="8.5" cy="8" r="4" fill="#ffd95a" />}
          <g transform="translate(2.5 3)" fill="#fff">
            <path d="M7 17a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5 4 4 0 0 1 17.5 17Z" opacity=".95" />
          </g>
        </>
      )}
      {(kind === "cloudy" || kind === "fog") && <g fill="#fff">{cloud}</g>}
      {kind === "rain" && (
        <>
          <g fill="#e8eef5">{cloud}</g>
          <g stroke="#6fb4ff" strokeWidth="1.8" strokeLinecap="round">
            <path d="M8 19l-1 2.4M12.5 19l-1 2.4M17 19l-1 2.4" />
          </g>
        </>
      )}
      {kind === "snow" && (
        <>
          <g fill="#f2f6fa">{cloud}</g>
          <g fill="#fff">
            <circle cx="8" cy="20" r="1.1" />
            <circle cx="12" cy="21" r="1.1" />
            <circle cx="16" cy="20" r="1.1" />
          </g>
        </>
      )}
      {kind === "storm" && (
        <>
          <g fill="#aab6c4">{cloud}</g>
          <path d="M12.5 15 9.5 20h2.5l-1 3 4-5.5h-2.5l1-2.5Z" fill="#ffe46b" />
        </>
      )}
    </svg>
  );
}
