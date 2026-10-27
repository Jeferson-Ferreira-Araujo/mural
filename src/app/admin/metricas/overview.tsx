"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { brl, nf, panel, type Item } from "./parts";
import { UptimeCard } from "./uptime";

type Day = { d: string; users: number; murals: number; pins: number; reactions: number; revenue: number };
type Counts = { users: number; murals: number; pins: number; reactions: number; revenue: number };
type O = {
  days: number;
  series: Day[];
  totals: Counts;
  period: Counts;
  previous: Counts;
  new_vs_returning: { new: number; returning: number };
  plans: Item[];
  recent_users: { nick: string; avatar: string | null; at: string; murals: number }[];
  recent_pins: { type: string; at: string; mural_owner: string; mural_title: string; author: string | null }[];
  generated_at: string;
};
export type Extra = { pins_by_type: { name: string; total: number }[]; devices: Item[]; referrers: Item[] } | null;

const PIN_TYPE: Record<string, string> = { postit: "Post-it", text: "Texto", photo: "Foto", video: "Vídeo", voice: "Voz", music: "Música", place: "Lugar", list: "Lista", draw: "Desenho" };
const DEVICE: Record<string, string> = { desktop: "Computador", mobile: "Celular", tablet: "Tablet", outro: "Outro" };
const PALETTE = ["#f2728a", "#4a8df0", "#9a7be0", "#4fbf86", "#f6c445", "#a4a8b3"];

const ago = (iso: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora há pouco";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
};
const dayLabel = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");

type KpiDef = { key: keyof Counts; title: string; fmt: (n: number) => string; bg: string; ink: string; icon: React.ReactNode; line: string };
const ic = { viewBox: "0 0 24 24", className: "size-6", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const KPIS: KpiDef[] = [
  { key: "users", title: "Usuários cadastrados", fmt: nf, bg: "#e8f0fb", ink: "#2f6fd6", line: "#4a8df0", icon: <svg {...ic}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 5.2a3.2 3.2 0 0 1 0 5.6M18.5 14.8c1.7.7 2.5 2.4 2.5 5.2" /></svg> },
  { key: "murals", title: "Murais criados", fmt: nf, bg: "#fde8ea", ink: "#d9455f", line: "#f2728a", icon: <svg {...ic}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M10 10v10" /></svg> },
  { key: "pins", title: "Pins postados", fmt: nf, bg: "#fdf2dc", ink: "#c98a12", line: "#f6b73c", icon: <svg {...ic}><path d="M5 5h14v10l-4 4H5V5Z" /><path d="M15 19v-4h4M8.5 9.5h7" /></svg> },
  { key: "reactions", title: "Reações", fmt: nf, bg: "#efe9fb", ink: "#7a4fd1", line: "#9a7be0", icon: <svg {...ic} fill="currentColor" stroke="none"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" /></svg> },
  { key: "revenue", title: "Receita", fmt: brl, bg: "#e6f6ea", ink: "#2f8f4e", line: "#3aa85f", icon: <svg {...ic}><circle cx="12" cy="12" r="9" /><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.8 0 2.600 5 1.200 5 3.800 0 1.100-1.100 1.900-2.500 1.900-1.200 0-2.200-.5-2.700-1.400M12 6.500V8M12 16v1.500" /></svg> },
];

/** Linha suave (sparkline) dos números por dia, em SVG. */
function Spark({ values, color }: { values: number[]; color: string }) {
  const W = 120;
  const H = 36;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? W / (values.length - 1) : W;
  const pts = values.map((v, i) => [i * step, H - 3 - (v / max) * (H - 8)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function KpiCard({ k, o }: { k: KpiDef; o: O }) {
  const cur = o.period[k.key];
  const prev = o.previous[k.key];
  const delta = prev > 0 ? ((cur - prev) / prev) * 100 : null;
  return (
    <div className="rounded-2xl p-4 shadow-[0_2px_10px_rgba(90,60,20,.07)]" style={{ background: k.bg }}>
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/70" style={{ color: k.ink }}>
          {k.icon}
        </span>
        <div className="min-w-0">
          <p className="font-title truncate text-[1.65rem] leading-none font-semibold tabular-nums">{k.fmt(o.totals[k.key])}</p>
          <p className="mt-1 truncate text-sm text-[#4a3826]">{k.title}</p>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: delta === null ? "#6b5440" : delta >= 0 ? "#2f8f4e" : "#c0392b" }} title={`No período: ${k.fmt(cur)} (antes: ${k.fmt(prev)})`}>
          {delta === null ? (cur > 0 ? "novo" : "—") : `${delta >= 0 ? "↗" : "↘"} ${delta >= 0 ? "+" : ""}${Math.abs(delta) < 10 ? delta.toFixed(1).replace(".", ",") : Math.round(delta)}%`}
        </p>
        <div className="w-[48%]">
          <Spark values={o.series.map((d) => d[k.key])} color={k.line} />
        </div>
      </div>
    </div>
  );
}

function niceMax(n: number) {
  if (n <= 4) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(n)));
  const m = n / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 4 ? 4 : m <= 5 ? 5 : 10) * p;
}

/** Gráfico de área com grade, eixo, balão ao passar o mouse e ponto destacado. */
function GrowthChart({ days, metric }: { days: Day[]; metric: keyof Counts }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 860;
  const H = 280;
  const pad = { l: 44, r: 14, t: 16, b: 30 };
  const fmt = (n: number) => (metric === "revenue" ? brl(n) : nf(n));
  const vals = days.map((d) => d[metric]);
  const top = niceMax(Math.max(1, ...vals));
  const step = days.length > 1 ? (W - pad.l - pad.r) / (days.length - 1) : 0;
  const xy = vals.map((v, i) => [pad.l + i * step, pad.t + (1 - v / top) * (H - pad.t - pad.b)] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = xy.length ? `${line} L${xy[xy.length - 1][0].toFixed(1)} ${H - pad.b} L${xy[0][0].toFixed(1)} ${H - pad.b} Z` : "";
  const every = Math.max(1, Math.ceil(days.length / 9));
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const hx = hover !== null ? xy[hover] : null;
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-64 w-full"
        role="img"
        aria-label="Gráfico por dia"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(days.length - 1, Math.round((x - pad.l) / (step || 1)))));
        }}
      >
        <defs>
          <linearGradient id="ov-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4a8df0" stopOpacity=".38" />
            <stop offset="100%" stopColor="#4a8df0" stopOpacity=".03" />
          </linearGradient>
        </defs>
        {ticks.map((t) => {
          const y = pad.t + (1 - t) * (H - pad.t - pad.b);
          return (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#eadfca" />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#8a7b69">{metric === "revenue" ? `R$ ${nf((top * t) / 100)}` : nf(top * t)}</text>
            </g>
          );
        })}
        <path d={area} fill="url(#ov-area)" />
        <path d={line} fill="none" stroke="#2f6fd6" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        {xy.map(([x, y], i) => (days.length <= 45 ? <circle key={i} cx={x} cy={y} r="2.6" fill="#2f6fd6" /> : null))}
        {days.map((d, i) => (i % every === 0 ? <text key={d.d} x={xy[i][0]} y={H - 8} textAnchor="middle" fontSize="11" fill="#8a7b69">{dayLabel(d.d)}</text> : null))}
        {hx && (
          <>
            <line x1={hx[0]} x2={hx[0]} y1={pad.t} y2={H - pad.b} stroke="#2f6fd6" strokeOpacity=".35" strokeDasharray="3 3" />
            <circle cx={hx[0]} cy={hx[1]} r="5.5" fill="#fff" stroke="#2f6fd6" strokeWidth="2.4" />
          </>
        )}
      </svg>
      {hover !== null && hx && days[hover] && (
        <div className="pointer-events-none absolute z-10 rounded-xl bg-white px-3 py-1.5 text-xs shadow-[0_4px_14px_rgba(60,35,10,.25)]" style={{ left: `${(hx[0] / W) * 100}%`, top: `${Math.max(0, (hx[1] / H) * 100 - 22)}%`, transform: "translateX(-50%)" }}>
          <p className="text-[#6b5440]">{dayLabel(days[hover].d)}</p>
          <p className="font-bold text-[#2f6fd6]">{fmt(vals[hover])}</p>
        </div>
      )}
    </div>
  );
}

/** Rosca com número no meio e legenda com percentuais. */
function Donut({ parts, center, sub, label }: { parts: { name: string; value: number; color: string }[]; center: string; sub: string; label: string }) {
  const total = parts.reduce((n, p) => n + p.value, 0);
  const R = 62;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div>
      <div className="relative mx-auto size-44">
        <svg viewBox="0 0 160 160" className="size-full -rotate-90" role="img" aria-label={label}>
          <circle cx="80" cy="80" r={R} fill="none" stroke="#efe4cf" strokeWidth="20" />
          {total > 0 &&
            parts.map((p) => {
              const len = (p.value / total) * C;
              const el = <circle key={p.name} cx="80" cy="80" r={R} fill="none" stroke={p.color} strokeWidth="20" strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-acc} />;
              acc += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <p className="font-title text-[1.7rem] leading-none font-semibold tabular-nums">{center}</p>
          <p className="mt-1 text-xs text-[#6b5440]">{sub}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {parts.map((p) => (
          <li key={p.name} className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-[4px]" style={{ background: p.color }} />
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            <span className="font-semibold tabular-nums">{total > 0 ? `${Math.round((p.value / total) * 100)}%` : "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ColumnBars({ rows }: { rows: { name: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="mt-4 flex h-52 items-end justify-around gap-2">
      {rows.map((r, i) => (
        <div key={r.name} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <span className="text-xs font-semibold tabular-nums">{nf(r.value)}</span>
          <div className="w-full max-w-[3.2rem] rounded-t-md" style={{ height: `${Math.max(3, (r.value / max) * 150)}px`, background: PALETTE[i % PALETTE.length] }} />
          <span className="w-full truncate text-center text-xs text-[#4a3826]">{r.name}</span>
        </div>
      ))}
    </div>
  );
}

function RowBars({ rows, empty }: { rows: { name: string; value: number }[]; empty: string }) {
  const total = rows.reduce((n, r) => n + r.value, 0);
  if (total === 0) return <p className="mt-3 text-sm text-[#8a7b69]">{empty}</p>;
  return (
    <ul className="mt-3 space-y-3">
      {rows.map((r, i) => {
        const p = (r.value / total) * 100;
        return (
          <li key={r.name} className="grid grid-cols-[minmax(0,7.5rem)_1fr_3rem] items-center gap-3 text-sm">
            <span className="truncate">{r.name}</span>
            <span className="h-3 rounded-full bg-[#efe4cf]">
              <span className="block h-full rounded-full" style={{ width: `${Math.max(3, p)}%`, background: PALETTE[[1, 0, 4, 2, 5][i % 5]] }} />
            </span>
            <span className="text-right font-semibold tabular-nums">{Math.round(p)}%</span>
          </li>
        );
      })}
    </ul>
  );
}

function RevenueBars({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map((d) => d.revenue));
  const top = niceMax(max / 100) * 100;
  const every = Math.max(1, Math.ceil(days.length / 8));
  return (
    <div className="mt-3">
      <div className="flex h-44 items-end gap-[3px] border-b border-[#eadfca]">
        {days.map((d) => (
          <div key={d.d} className="group relative flex h-full flex-1 items-end" title={`${dayLabel(d.d)} · ${brl(d.revenue)}`}>
            <div className="w-full rounded-t-[3px] bg-[#3aa85f]" style={{ height: `${Math.max(d.revenue ? 4 : 1.5, (d.revenue / top) * 100)}%`, opacity: d.revenue ? 1 : 0.25 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[3px] text-[10px] text-[#8a7b69]">
        {days.map((d, i) => (
          <span key={d.d} className="flex-1 text-center whitespace-nowrap">
            {i % every === 0 ? dayLabel(d.d) : ""}
          </span>
        ))}
      </div>
      <p className="mt-1 text-xs text-[#8a7b69]">Maior dia: {brl(max)}</p>
    </div>
  );
}

const PIN_COLOR: Record<string, string> = { postit: "#f6c445", text: "#4a8df0", photo: "#4fbf86", video: "#9a7be0", voice: "#f2728a", music: "#9a7be0", place: "#4fbf86", list: "#a4a8b3", draw: "#f2728a" };

export function OverviewView({ days, extra }: { days: number; extra: Extra }) {
  const [o, setO] = useState<O | null>(null);
  const [metric, setMetric] = useState<keyof Counts>("users");
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await getBrowserSupabase().rpc("admin_overview", { p_days: days });
    if (error) return setErr("Não foi possível carregar o painel.");
    setErr(null);
    setO(data as O);
  }, [days]);
  useEffect(() => {
    setO(null);
    void load();
    const t = window.setInterval(() => document.visibilityState === "visible" && void load(), 30_000);
    return () => window.clearInterval(t);
  }, [load]);

  if (err) return <p role="alert" className="mt-5 text-sm font-semibold text-[#a23b2a]">{err}</p>;
  if (!o)
    return (
      <div className="grid place-items-center py-16">
        <Spinner />
      </div>
    );

  const metricTitle: Record<keyof Counts, [string, string]> = {
    users: ["Crescimento de usuários", "Novos usuários por dia"],
    murals: ["Crescimento de murais", "Novos murais por dia"],
    pins: ["Pins postados", "Pins por dia"],
    reactions: ["Reações", "Reações por dia"],
    revenue: ["Receita", "Receita por dia"],
  };
  const MET_OPT: [keyof Counts, string][] = [["users", "Usuários cadastrados"], ["murals", "Murais criados"], ["pins", "Pins postados"], ["reactions", "Reações"], ["revenue", "Receita"]];
  const types = (extra?.pins_by_type ?? []).slice(0, 6).map((t) => ({ name: PIN_TYPE[t.name] ?? t.name, value: t.total }));
  const devices = (extra?.devices ?? []).slice(0, 4).map((d, i) => ({ name: DEVICE[d.name] ?? d.name, value: d.value, color: ["#f2728a", "#9a7be0", "#f6c445", "#a4a8b3"][i] }));
  const nvr = o.new_vs_returning;
  const origin = (extra?.referrers ?? []).slice(0, 5).map((r) => ({ name: r.name === "direto" ? "Direto" : r.name, value: r.value }));
  const plans = o.plans;
  const card = `${panel} p-4`;

  return (
    <div className="mt-4 space-y-4">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5" aria-label="Números do período">
        {KPIS.map((k) => (
          <KpiCard key={k.key} k={k} o={o} />
        ))}
      </section>

      <UptimeCard />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)_minmax(0,1fr)]" aria-label="Evolução">
        <div className={card}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-title text-lg font-semibold">{metricTitle[metric][0]}</h2>
              <p className="text-sm text-[#6b5440]">{metricTitle[metric][1]}</p>
            </div>
            <select value={metric} onChange={(e) => setMetric(e.target.value as keyof Counts)} aria-label="Métrica do gráfico" className="cursor-pointer rounded-xl border border-[#e1d3ba] bg-white px-3 py-2 text-sm font-semibold">
              {MET_OPT.map(([k, t]) => (
                <option key={k} value={k}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <GrowthChart days={o.series} metric={metric} />
        </div>
        <div className={card}>
          <h2 className="font-title text-lg font-semibold">Novos vs. Recorrentes</h2>
          <p className="mb-3 text-sm text-[#6b5440]">Quem usou o Pinz no período</p>
          <Donut
            label="Novos e recorrentes"
            center={nf(nvr.new + nvr.returning)}
            sub="usuários"
            parts={[
              { name: "Novos usuários", value: nvr.new, color: "#4a8df0" },
              { name: "Recorrentes", value: nvr.returning, color: "#4fbf86" },
            ]}
          />
        </div>
        <div className={card}>
          <h2 className="font-title text-lg font-semibold">Dispositivos</h2>
          <p className="mb-3 text-sm text-[#6b5440]">Sessões medidas</p>
          {devices.length ? <Donut label="Dispositivos" center={nf(devices.reduce((n, d) => n + d.value, 0))} sub="sessões" parts={devices} /> : <p className="text-sm text-[#8a7b69]">Sem dados ainda neste período.</p>}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]" aria-label="Distribuições">
        <div className={card}>
          <h2 className="font-title text-lg font-semibold">Pins por tipo</h2>
          {types.length ? <ColumnBars rows={types} /> : <p className="mt-3 text-sm text-[#8a7b69]">Sem pins ainda.</p>}
        </div>
        <div className={card}>
          <h2 className="font-title text-lg font-semibold">Planos mais populares</h2>
          <RowBars rows={plans} empty="Sem contas ainda." />
        </div>
        <div className={card}>
          <h2 className="font-title text-lg font-semibold">Origem de tráfego</h2>
          <RowBars rows={origin} empty="Sem dados ainda (esse detalhe só vem de quem aceitou o aviso de cookies)." />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]" aria-label="Últimas atividades">
        <div className={card}>
          <h2 className="font-title text-lg font-semibold">Últimos usuários</h2>
          <ul className="mt-3 space-y-3">
            {o.recent_users.map((u) => (
              <li key={u.nick + u.at} className="flex items-center gap-3 text-sm">
                <Avatar src={u.avatar} name={u.nick} className="size-9" />
                <span className="min-w-0">
                  <b>{u.nick}</b>
                  <span className="block truncate text-xs text-[#8a7b69]">
                    {u.murals > 0 ? `criou ${u.murals} ${u.murals === 1 ? "mural" : "murais"}` : "entrou"} • {ago(u.at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className={card}>
          <h2 className="font-title text-lg font-semibold">Últimos pins</h2>
          <ul className="mt-3 space-y-3">
            {o.recent_pins.map((p, i) => (
              <li key={p.at + i} className="flex items-center gap-3 text-sm">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white" style={{ background: PIN_COLOR[p.type] ?? "#a4a8b3" }}>
                  {(PIN_TYPE[p.type] ?? p.type).slice(0, 2)}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate">Novo pin ({PIN_TYPE[p.type] ?? p.type})</b>
                  <span className="block truncate text-xs text-[#8a7b69]">no mural de {p.mural_owner}</span>
                </span>
                <span className="shrink-0 text-xs text-[#8a7b69]">{ago(p.at)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={card}>
          <h2 className="font-title text-lg font-semibold">Crescimento da receita</h2>
          <RevenueBars days={o.series} />
        </div>
      </section>
      <p className="text-xs text-[#8a7b69]">Atualizado às {new Date(o.generated_at).toLocaleTimeString("pt-BR")}.</p>
    </div>
  );
}
