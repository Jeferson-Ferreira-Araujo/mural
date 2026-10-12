"use client";

import { baseStyle, shapeOfStyle } from "@/lib/displayShape";
import type { SceneId } from "./scenes";
import { useViewerCoords } from "@/lib/geo";
import { describe, Marquee, tempTint, useWeather, WeatherGlyph, WidgetFrame, type WeatherKind } from "./core";

export type WeatherStyle = "sky" | "nature" | "pixel" | "rain" | "night";

/** Paisagem de cada estilo conforme o tempo agora. "rain" e "night" ficam sempre assim; "sky" e "nature" acompanham o tempo. */
function sceneFor(style: string, kind: WeatherKind, night: boolean, temp: number | null): SceneId {
  if (style === "rain") return "rain";
  if (style === "night") return "night";
  if (style === "pixel") return "pixel";
  if (kind === "rain") return "rain";
  if (kind === "storm") return "storm";
  if (kind === "snow") return "snow";
  if (kind === "fog") return "fog";
  if (night) return "night";
  if (kind === "cloudy") return "cloudy";
  if (temp !== null && temp <= 14) return "mountains"; // frio: montanhas
  return style === "nature" ? "lake" : "beach";
}

/** Clima quadrado (12 × 12 em): o desenho do tempo em cima, a temperatura grande no meio e a cidade e o tempo embaixo. */
function WeatherSquare({ st, scene, kind, night, temp, label, cityName, d, frame, tint }: { tint: string | null; st: string; scene: SceneId; kind: WeatherKind; night: boolean; temp: string; label: string; cityName: string; d: ReturnType<typeof describe> | null; frame?: string | null }) {
  const pixel = st === "pixel";
  const font = pixel ? "var(--font-silk), monospace" : undefined;
  const glyphKind: WeatherKind = st === "rain" ? (d && d.kind !== "clear" && d.kind !== "partly" ? d.kind : "rain") : kind;
  return (
    <WidgetFrame frame={frame} label="Clima" scene={scene} shape="square">
      {tint && <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: tint }} />}
      <div className="absolute inset-0 flex flex-col items-center justify-between px-[1em] pt-[1em] pb-[1.1em] text-center">
        <span className="size-[4.2em] text-white">
          <WeatherGlyph kind={glyphKind} night={st === "rain" ? false : night} />
        </span>
        <p className="tabular-nums" style={{ fontSize: pixel ? "4.2em" : "5em", fontWeight: 700, fontFamily: font, lineHeight: 1 }}>
          {pixel && temp.endsWith("°") ? (<>{temp.slice(0, -1)}<span style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>°</span></>) : temp}
        </p>
        <div className="w-full leading-tight">
          <Marquee text={cityName} className="font-semibold" style={{ fontSize: "1.2em" }} />
          <p className="opacity-95" style={{ fontSize: "0.95em" }}>
            {label}
          </p>
        </div>
      </div>
    </WidgetFrame>
  );
}

/** Clima: cinco estilos, em formato retangular ou quadrado. O tempo agora na cidade escolhida pelo dono, sempre atualizado. */
export function WeatherWidget({ style = "sky", city, lat, lon, frame, preview = false }: { style?: string; city?: string; lat?: number; lon?: number; frame?: string | null; /** prévia (loja, formulário): usa só a cidade escolhida, sem pedir a localização de quem vê */ preview?: boolean }) {
  // o tempo é o do lugar onde QUEM VÊ está (o navegador pergunta uma vez); sem permissão, vale a cidade escolhida pelo dono
  const ownerSample = lat === undefined || lon === undefined || (lat === 0 && lon === 0);
  const viewer = useViewerCoords(!preview && !ownerSample);
  const here = viewer.coords;
  const { now } = useWeather(here ? here.lat : lat, here ? here.lon : lon, !!here);
  const d = now && now !== "error" ? describe(now.symbol) : null;
  const b = baseStyle(style);
  const st = b === "nature" || b === "pixel" || b === "rain" || b === "night" ? b : "sky";
  const kind: WeatherKind = d?.kind ?? "clear";
  const night = st === "night" || (d?.night ?? false);
  const degrees = now && now !== "error" ? now.temp : null;
  const scene = sceneFor(st, kind, night, degrees);
  const tint = tempTint(degrees);
  const temp = now && now !== "error" ? `${now.temp}°` : "--°";
  const label = st === "night" && d && d.kind === "clear" ? "Limpo" : d ? d.label : now === "error" ? "Sem dados agora" : "Buscando…";
  const pixel = st === "pixel";
  const font = pixel ? "var(--font-silk), monospace" : undefined;
  const cityName = here ? (now && now !== "error" && now.place ? now.place : "Sua localização") : (city ?? "Cidade");

  if (shapeOfStyle(style) === "square") return <WeatherSquare st={st} scene={scene} kind={kind} night={night} temp={temp} label={label} cityName={cityName} d={d} frame={frame} tint={tint} />;

  // rain: a cidade em cima, à esquerda; a temperatura grande embaixo; nuvem com gotas à direita
  if (st === "rain") {
    return (
      <WidgetFrame frame={frame} label="Clima" scene="rain">
        {tint && <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: tint }} />}
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
      {tint && <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: tint }} />}
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
