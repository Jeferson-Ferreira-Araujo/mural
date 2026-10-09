"use client";

import { useEffect, useState } from "react";
import { ClockIcon, MoonIcon, ScenicCard, SunIcon, type SceneId } from "./ScenicCard";

/** Fusos que o dono pode escolher (o servidor aceita só estes) e o nome mostrado no cartão. */
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

function partsIn(tz: string, now: Date) {
  const zone = tz === "local" ? undefined : tz;
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: zone }).format(now);
  const date = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: zone }).format(now).replace(/\./g, "");
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: zone }).format(now)) % 24;
  return { time, date, hour };
}

/** A paisagem acompanha a hora: amanhecer, dia, entardecer e noite. */
export const sceneForHour = (h: number): SceneId => (h >= 5 && h < 8 ? "meadow" : h >= 8 && h < 17 ? "day" : h >= 17 && h < 19 ? "mountains" : "night");

/** Pin "Relógio": a hora passa sozinha (atualiza a cada poucos segundos) e a paisagem muda com o dia. */
export function ClockCard({ tz, frame }: { tz?: string; frame?: string | null }) {
  const zone = tz && CLOCK_ZONES.some((z) => z.id === tz) ? tz : "America/Sao_Paulo";
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 5000);
    return () => window.clearInterval(t);
  }, []);
  const p = now ? partsIn(zone, now) : null;
  const scene = sceneForHour(p?.hour ?? 12);
  const night = scene === "night";
  const place = CLOCK_ZONES.find((z) => z.id === zone)?.label;
  return (
    <ScenicCard scene={scene} frame={frame} left={<ClockIcon />} right={night ? <MoonIcon /> : <SunIcon />} label="Relógio">
      <p className="tabular-nums leading-none" style={{ fontFamily: "var(--font-patrick), cursive", fontSize: "2.7em" }} suppressHydrationWarning>
        {p?.time ?? "--:--"}
      </p>
      <p className="mt-[0.35em] text-[0.95em] leading-tight capitalize" style={{ fontFamily: "var(--font-patrick), cursive" }} suppressHydrationWarning>
        {p?.date ?? ""}
      </p>
      {zone !== "local" && place && <p className="mt-[0.2em] text-[0.7em] leading-tight opacity-85">{place}</p>}
    </ScenicCard>
  );
}
