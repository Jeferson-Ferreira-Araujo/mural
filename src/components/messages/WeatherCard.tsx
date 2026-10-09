"use client";

import { useEffect, useState } from "react";
import { CloudIcon, MoonIcon, ScenicCard, SunIcon, type SceneId } from "./ScenicCard";

type Now = { temp: number; symbol: string };

const inflight = new Map<string, Promise<Now | null>>();
const memo = new Map<string, { at: number; data: Now }>();

/** Busca o tempo agora (o servidor guarda por 20 minutos); várias cartas da mesma cidade dividem a mesma chamada. */
function loadWeather(lat: number, lon: number): Promise<Now | null> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return Promise.resolve(hit.data);
  let p = inflight.get(key);
  if (!p) {
    p = fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      .then((r) => (r.ok ? (r.json() as Promise<Now>) : null))
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

/** Código do MET Norway (ex.: "partlycloudy_day", "lightrain") → paisagem, texto e se é noite. */
export function describe(symbol: string): { scene: SceneId; label: string; night: boolean } {
  const night = symbol.endsWith("_night");
  const base = symbol.replace(/_(day|night|polartwilight)$/, "");
  if (base.includes("thunder")) return { scene: "storm", label: "Trovoadas", night };
  if (base.includes("snow")) return { scene: "snow", label: "Neve", night };
  if (base.includes("sleet")) return { scene: "snow", label: "Chuva com neve", night };
  if (base.includes("rain")) return { scene: "rain", label: base.includes("heavy") ? "Chuva forte" : base.includes("light") ? "Chuva fraca" : "Chuva", night };
  if (base === "fog") return { scene: "fog", label: "Neblina", night };
  if (base === "cloudy") return { scene: "cloudy", label: "Nublado", night };
  if (base === "partlycloudy") return { scene: night ? "night" : "day", label: "Parcialmente nublado", night };
  return { scene: night ? "night" : "day", label: "Céu limpo", night };
}

/** Pin "Clima": o tempo de agora na cidade escolhida pelo dono, sempre atualizado. */
export function WeatherCard({ city, lat, lon, frame }: { city?: string; lat?: number; lon?: number; frame?: string | null }) {
  const [now, setNow] = useState<Now | null | "error">(null);
  useEffect(() => {
    if (typeof lat !== "number" || typeof lon !== "number" || (lat === 0 && lon === 0)) return;
    let alive = true;
    const run = () => void loadWeather(lat, lon).then((d) => alive && setNow(d ?? "error"));
    run();
    const t = window.setInterval(run, 15 * 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [lat, lon]);
  const sample = (lat === 0 && lon === 0) || lat === undefined; // prévia no compositor, antes de escolher a cidade
  const shown: Now | null | "error" = sample ? { temp: 24, symbol: "partlycloudy_day" } : now;
  const d = shown && shown !== "error" ? describe(shown.symbol) : null;
  const scene: SceneId = d?.scene ?? "day";
  return (
    <ScenicCard scene={scene} frame={frame} left={<CloudIcon />} right={d?.night ? <MoonIcon /> : <SunIcon />} label="Clima">
      <p className="tabular-nums leading-none" style={{ fontFamily: "var(--font-patrick), cursive", fontSize: "2.9em" }}>
        {shown && shown !== "error" ? `${shown.temp}°` : "--°"}
      </p>
      <p className="mt-[0.3em] text-[0.95em] leading-tight" style={{ fontFamily: "var(--font-patrick), cursive" }}>
        {d ? d.label : shown === "error" ? "Sem dados agora" : "Buscando…"}
      </p>
      <p className="mt-[0.25em] max-w-full truncate text-[0.72em] leading-tight font-semibold opacity-90">{city ?? "Cidade"}</p>
    </ScenicCard>
  );
}
