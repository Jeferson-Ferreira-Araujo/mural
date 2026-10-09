"use client";

import { Corner, ClockIcon, CLOCK_ZONES, isNightHour, MoonIcon, sceneForHour, SunIcon, useNow, WidgetFrame, type Now } from "./core";
import { Skyline } from "./scenes";

export type ClockStyle = "sunset" | "flip" | "minimal" | "analog" | "pixel";

const dateLine = (n: Now | null) => (n ? `${n.weekdayShort}, ${n.day} de ${n.monthShort.charAt(0).toUpperCase() + n.monthShort.slice(1)}` : "");

/** Folhas do estilo Minimal e Analógico (cantos). */
const Leaves = ({ dark }: { dark?: boolean }) => (
  <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
    <g fill={dark ? "#2f6a3a" : "#5b8a44"} opacity={dark ? 0.95 : 0.85}>
      <path d="M0 100 C2 78 14 64 32 60 C32 80 20 94 0 100 Z" />
      <path d="M12 100 C14 88 28 78 46 78 C42 92 28 100 12 100 Z" fill={dark ? "#3f8a4a" : "#7aa857"} />
      <path d="M200 0 C198 22 186 36 168 40 C168 20 180 6 200 0 Z" />
      <path d="M188 0 C186 12 172 22 154 22 C158 8 172 0 188 0 Z" fill={dark ? "#3f8a4a" : "#7aa857"} />
      <path d="M200 100 C198 84 190 74 176 70 C176 86 184 96 200 100 Z" opacity=".8" />
    </g>
  </svg>
);

function Flip({ v }: { v: string }) {
  return (
    <div className="relative grid h-[6.4em] w-[5.2em] place-items-center overflow-hidden rounded-[0.5em]" style={{ background: "linear-gradient(180deg,#2a2a2e 0%,#1b1b1e 49%,#101012 51%,#232326 100%)", boxShadow: "inset 0 0 0 0.1em rgba(255,255,255,.12), 0 0.15em 0.3em rgba(0,0,0,.6)" }}>
      <span className="font-bold tabular-nums" style={{ fontSize: "4.3em", lineHeight: 1, color: "#f4f4f4", textShadow: "none" }}>
        {v}
      </span>
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-[0.12em] -translate-y-1/2 bg-black/80" />
    </div>
  );
}

/** Relógio: cinco estilos. A hora passa sozinha (atualiza a cada poucos segundos). */
export function ClockWidget({ style = "sunset", tz = "America/Sao_Paulo", frame }: { style?: string; tz?: string; frame?: string | null }) {
  const zone = CLOCK_ZONES.some((z) => z.id === tz) ? tz : "America/Sao_Paulo";
  const n = useNow(zone, 1000);
  const hour = n?.hour ?? 21;
  const place = zone !== "local" ? CLOCK_ZONES.find((z) => z.id === zone)?.label : null;
  const time = n ? `${n.hh}:${n.mm}` : "--:--";
  const wd = n?.weekdayShort ?? "";
  const dm = n ? `${n.day} ${n.monthShort}` : "";

  if (style === "flip") {
    return (
      <WidgetFrame frame={frame} label="Relógio">
        <div className="absolute inset-0 flex items-center justify-center gap-[1.3em] px-[1.4em]" style={{ background: "linear-gradient(145deg,#1d1d20,#0b0b0d)", color: "#f4f4f4" }}>
          <div className="flex gap-[0.6em]">
            <Flip v={n?.hh ?? "--"} />
            <Flip v={n?.mm ?? "--"} />
          </div>
          <div className="text-left leading-[1.15] uppercase" style={{ color: "#e8e8e8" }}>
            <p className="text-[1.5em] font-semibold tracking-wide">{wd.replace(/\./g, "")}</p>
            <p className="text-[1.25em] font-medium tracking-wide opacity-90">{dm}</p>
            {place && <p className="mt-[0.3em] text-[0.7em] opacity-60">{place}</p>}
          </div>
        </div>
      </WidgetFrame>
    );
  }

  if (style === "minimal" || style === "analog") {
    const analog = style === "analog";
    const secDeg = ((n?.second ?? 0) / 60) * 360;
    const minDeg = ((n?.minute ?? 0) + (n?.second ?? 0) / 60) * 6;
    const hourDeg = (((n?.hour ?? 0) % 12) + (n?.minute ?? 0) / 60) * 30;
    return (
      <WidgetFrame frame={frame} label="Relógio">
        <div className="absolute inset-0" style={{ background: analog ? "linear-gradient(145deg,#12301f,#0a1f14)" : "linear-gradient(145deg,#f4e6c6,#e3c993)", color: analog ? "#f1e6c8" : "#3a2a12" }}>
          <Leaves dark={analog} />
          <div className="absolute inset-0 flex items-center justify-center gap-[1.4em] px-[2em]">
            {analog ? (
              <svg viewBox="-50 -50 100 100" className="size-[9.6em] shrink-0" aria-label={time}>
                <circle r="47" fill="#0d2a1b" stroke="#c9a96a" strokeWidth="2.5" />
                <circle r="43" fill="none" stroke="#c9a96a" strokeWidth="0.6" opacity=".6" />
                {Array.from({ length: 12 }, (_, i) => (
                  <line key={i} x1="0" y1="-41" x2="0" y2={i % 3 === 0 ? -35 : -38} stroke="#e8d9ae" strokeWidth={i % 3 === 0 ? 1.8 : 1} transform={`rotate(${i * 30})`} />
                ))}
                {[
                  ["12", 0, -28],
                  ["3", 28, 3.5],
                  ["6", 0, 32],
                  ["9", -28, 3.5],
                ].map(([t, x, y]) => (
                  <text key={t as string} x={x as number} y={y as number} textAnchor="middle" fontSize="10" fill="#f1e6c8" style={{ fontFamily: "var(--font-playfair), serif" }}>
                    {t}
                  </text>
                ))}
                <line x1="0" y1="4" x2="0" y2="-22" stroke="#f1e6c8" strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${hourDeg})`} />
                <line x1="0" y1="5" x2="0" y2="-33" stroke="#f1e6c8" strokeWidth="1.8" strokeLinecap="round" transform={`rotate(${minDeg})`} />
                <line x1="0" y1="8" x2="0" y2="-36" stroke="#e0a63a" strokeWidth="0.9" strokeLinecap="round" transform={`rotate(${secDeg})`} />
                <circle r="2.4" fill="#e0a63a" />
              </svg>
            ) : (
              <p className="tabular-nums" style={{ fontSize: "4.6em", fontWeight: 300, lineHeight: 1, letterSpacing: "-0.02em" }} suppressHydrationWarning>
                {time}
              </p>
            )}
            <span aria-hidden className="h-[6em] w-px shrink-0" style={{ background: analog ? "rgba(241,230,200,.45)" : "rgba(58,42,18,.4)" }} />
            <div className="leading-tight" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
              <p className="text-[1.6em] font-medium" suppressHydrationWarning>
                {wd}
              </p>
              <p className="text-[1.4em]" suppressHydrationWarning>
                {n ? `${n.day} ${n.monthShort.charAt(0).toUpperCase()}${n.monthShort.slice(1)}` : ""}
              </p>
              {place && <p className="mt-[0.2em] text-[0.62em] opacity-70">{place}</p>}
            </div>
          </div>
        </div>
      </WidgetFrame>
    );
  }

  if (style === "pixel") {
    return (
      <WidgetFrame frame={frame} label="Relógio">
        <div className="absolute inset-0 overflow-hidden" style={{ background: "linear-gradient(180deg,#0a0f2e 0%,#1d2160 55%,#6a3a78 85%,#d9784a 100%)", color: "#fff" }}>
          <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden shapeRendering="crispEdges">
            {[
              [12, 14],
              [34, 30],
              [70, 12],
              [120, 20],
              [150, 38],
              [184, 16],
              [96, 34],
              [20, 50],
            ].map(([x, y], i) => (
              <g key={i} fill="#fff">
                <rect x={x} y={y} width="2" height="2" />
                <rect x={x - 2} y={y} width="6" height="2" opacity=".5" />
              </g>
            ))}
            <Skyline fill="#140f2e" />
            <g fill="#ffd36a" opacity=".85">
              {[16, 36, 70, 100, 134, 164, 186].map((x, i) => (
                <rect key={x} x={x} y={78 + (i % 3) * 5} width="2" height="2" />
              ))}
            </g>
          </svg>
          <span className="absolute top-[0.7em] right-[0.9em] size-[1.7em] opacity-95">
            <svg viewBox="0 0 24 24" className="size-full" aria-hidden shapeRendering="crispEdges">
              <path d="M14 3.5A5.2 5.2 0 1 0 19 11a4.2 4.2 0 0 1-5-7.5Z" fill="#f4efd6" />
            </svg>
          </span>
          <div className="absolute inset-x-0 top-[1.1em] text-center">
            <p className="tabular-nums" style={{ fontFamily: "var(--font-silk), monospace", fontSize: "4.4em", fontWeight: 700, lineHeight: 1, letterSpacing: "0.02em", textShadow: "0.06em 0.06em 0 #2a1f6a" }} suppressHydrationWarning>
              {time}
            </p>
            <p style={{ fontFamily: "var(--font-silk), monospace", fontSize: "1.15em", marginTop: "0.45em", letterSpacing: "0.12em", textTransform: "uppercase", textShadow: "0.08em 0.08em 0 #2a1f6a" }} suppressHydrationWarning>
              {wd} {n ? `${n.day} ${n.monthShort}` : ""}
            </p>
          </div>
        </div>
      </WidgetFrame>
    );
  }

  // sunset (padrão): paisagem dinâmica
  const scene = sceneForHour(hour);
  return (
    <WidgetFrame frame={frame} label="Relógio" scene={scene}>
      <Corner side="left">
        <ClockIcon />
      </Corner>
      <Corner side="right">{isNightHour(hour) ? <MoonIcon /> : <SunIcon />}</Corner>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-[0.5em]">
        <p className="tabular-nums" style={{ fontSize: "4.9em", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }} suppressHydrationWarning>
          {time}
        </p>
        <p className="mt-[0.3em] text-[1.2em] font-medium opacity-95" suppressHydrationWarning>
          {dateLine(n)}
        </p>
        {place && <p className="text-[0.7em] opacity-80">{place}</p>}
      </div>
    </WidgetFrame>
  );
}
