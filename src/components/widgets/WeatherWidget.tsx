"use client";

import type { SceneId } from "./scenes";
import { describe, useWeather, WeatherGlyph, WidgetFrame, type WeatherKind } from "./core";

export type WeatherStyle = "sky" | "nature" | "pixel" | "rain" | "night";

/** Paisagem de cada estilo conforme o tempo agora. "rain" e "night" ficam sempre assim; "sky" e "nature" acompanham o tempo. */
function sceneFor(style: string, kind: WeatherKind, night: boolean): SceneId {
  if (style === "rain") return "rain";
  if (style === "night") return "night";
  if (style === "pixel") return "pixel";
  if (kind === "rain") return "rain";
  if (kind === "storm") return "storm";
  if (kind === "snow") return "snow";
  if (kind === "fog") return "fog";
  if (night) return "night";
  if (kind === "cloudy") return "cloudy";
  return style === "nature" ? "lake" : "beach";
}

/** Clima: cinco estilos. O tempo agora na cidade escolhida pelo dono, sempre atualizado. */
export function WeatherWidget({ style = "sky", city, lat, lon, frame }: { style?: string; city?: string; lat?: number; lon?: number; frame?: string | null }) {
  const { now } = useWeather(lat, lon);
  const d = now && now !== "error" ? describe(now.symbol) : null;
  const st = style === "nature" || style === "pixel" || style === "rain" || style === "night" ? style : "sky";
  const kind: WeatherKind = d?.kind ?? "clear";
  const night = st === "night" || (d?.night ?? false);
  const scene = sceneFor(st, kind, night);
  const temp = now && now !== "error" ? `${now.temp}°` : "--°";
  const label = st === "night" && d && d.kind === "clear" ? "Limpo" : d ? d.label : now === "error" ? "Sem dados agora" : "Buscando…";
  const pixel = st === "pixel";
  const font = pixel ? "var(--font-silk), monospace" : undefined;
  const cityName = city ?? "Cidade";

  // rain: a cidade em cima, à esquerda; a temperatura grande embaixo; nuvem com gotas à direita
  if (st === "rain") {
    return (
      <WidgetFrame frame={frame} label="Clima" scene="rain">
        <p className="absolute top-[0.9em] left-[1.3em] max-w-[11em] truncate text-[0.95em] font-medium opacity-90">{cityName}</p>
        <div className="absolute bottom-[0.9em] left-[1.3em] leading-none">
          <p className="tabular-nums" style={{ fontSize: "4.4em", fontWeight: 600 }}>
            {temp}
          </p>
          <p className="mt-[0.35em] text-[1.05em] opacity-95">{label}</p>
        </div>
        <span className="absolute top-1/2 right-[2em] size-[6em] -translate-y-1/2 text-white">
          <WeatherGlyph kind={d && d.kind !== "clear" && d.kind !== "partly" ? d.kind : "rain"} night={false} />
        </span>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame frame={frame} label="Clima" scene={scene}>
      <div className="absolute inset-0 flex items-center gap-[0.7em] pr-[5em] pl-[1.5em]">
        <p className="shrink-0 tabular-nums" style={{ fontSize: pixel ? "3.9em" : "4.5em", fontWeight: 700, fontFamily: font, lineHeight: 1 }}>
          {pixel && temp.endsWith("°") ? (<>{temp.slice(0, -1)}<span style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>°</span></>) : temp}
        </p>
        <div className="min-w-0 leading-tight">
          <p className="truncate font-semibold" style={{ fontSize: "1.05em" }}>
            {cityName}
          </p>
          <p className="opacity-95" style={{ fontSize: "0.85em" }}>
            {label}
          </p>
        </div>
      </div>
      <span className="absolute top-[0.9em] right-[1em] size-[3.4em] text-white">
        <WeatherGlyph kind={kind} night={night} />
      </span>
    </WidgetFrame>
  );
}
