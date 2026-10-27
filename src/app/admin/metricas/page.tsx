"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loginUrl, useSession } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui";
import { Bars, brl, card, chip, Delta, Kpi, label, nf, type Item } from "./parts";
import { GrowthView } from "./growth";
import { OverviewView } from "./overview";
import { ONLINE_NOW } from "@/lib/online";

type Row = { name: string; total: number } & Record<string, number | string>;
type Day = { d: string; views: number; sessions: number; visitors: number; active: number; signups: number; pins: number; pins_del: number; displays: number; revenue: number };
type Metrics = {
  range: { from: string; to: string; days: number };
  totals: Record<"users" | "murals" | "pins" | "displays" | "badges" | "follows" | "plus" | "reactions" | "mural_visits" | "revenue_cents" | "orders" | "dau" | "wau" | "mau", number>;
  period: Record<"signups" | "sessions" | "visitors" | "views" | "active_users" | "pins" | "pins_del" | "displays" | "displays_del" | "murals" | "follows" | "accounts_deleted" | "revenue_cents" | "orders" | "payers" | "credits_spent", number>;
  previous: Record<"signups" | "sessions" | "visitors" | "views" | "active_users" | "pins" | "revenue_cents", number>;
  series: Day[];
  pins_by_type: (Row & { created: number; deleted: number })[];
  displays_by_product: (Row & { placed: number; removed: number })[];
  top_pages: Item[];
  referrers: Item[];
  devices: Item[];
  languages: Item[];
  timezones: Item[];
  tools: Item[];
  hours: number[];
  funnel: { sessions: number; signups: number; with_pin: number; payers: number };
  generated_at: string;
};
type Live = { online: number; online_logged: number; online_devices: Item[]; online_pages: Item[]; per_minute: number[]; today_views: number; today_sessions: number; feed: { at: string; name: string; nick: string | null; detail: string | null }[]; at: string };

const PERIODS: [number, string][] = [[7, "7 dias"], [30, "30 dias"], [90, "90 dias"], [365, "1 ano"], [0, "Tudo"]];
const PIN_TYPE: Record<string, string> = { postit: "Post-it", text: "Texto", photo: "Foto", video: "Vídeo", voice: "Voz", music: "Música", place: "Lugar", list: "Lista", draw: "Desenho" };
const DISPLAY: Record<string, string> = { bible: "Versículo", motivation: "Frase", clock: "Relógio", weather: "Clima", calendar: "Calendário", date: "Calendário do dia", countdown: "Contador regressivo", daycount: "Contador de dias", book: "Leitura de livro", top3: "Top 3", poll: "Enquete", cookie: "Biscoito da sorte", habit: "Meta de hábito", mood: "Humor do dia" };
const TOOL: Record<string, string> = { open_store: "Abriu a loja", open_composer: "Abriu o compositor", open_profile: "Abriu o perfil", open_notifications: "Abriu notificações", share: "Compartilhou", install: "Instalou o app", search: "Usou a busca", display_placed: "Colocou display", badge_placed: "Colocou botton", follow: "Seguiu alguém", mural_created: "Criou mural" };
const EVENT: Record<string, string> = { pin_created: "Pin criado", pin_deleted: "Pin excluído", display_placed: "Display colocado", display_removed: "Display removido", badge_placed: "Botton colocado", badge_removed: "Botton removido", mural_created: "Mural criado", mural_deleted: "Mural excluído", signup: "Novo cadastro", account_deleted: "Conta excluída", follow: "Novo seguidor", unfollow: "Deixou de seguir", login: "Entrou na conta", open_store: "Abriu a loja", open_composer: "Abriu o compositor", open_profile: "Abriu o perfil", search: "Usou a busca", share: "Compartilhou", install: "Instalou o app" };
const DEVICE: Record<string, string> = { desktop: "Computador", mobile: "Celular", tablet: "Tablet", outro: "Outro" };
/** Gráfico de área simples em SVG, com valores ao passar o mouse. */
function AreaChart({ points, fmt }: { points: { x: string; y: number }[]; fmt: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = 220;
  const pad = { l: 8, r: 8, t: 12, b: 24 };
  const max = Math.max(1, ...points.map((p) => p.y));
  const step = points.length > 1 ? (W - pad.l - pad.r) / (points.length - 1) : 0;
  const xy = points.map((p, i) => [pad.l + i * step, pad.t + (1 - p.y / max) * (H - pad.t - pad.b)] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = xy.length ? `${line} L${xy[xy.length - 1][0].toFixed(1)} ${H - pad.b} L${xy[0][0].toFixed(1)} ${H - pad.b} Z` : "";
  const every = Math.max(1, Math.ceil(points.length / 8));
  const fmtDay = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" role="img" aria-label="Gráfico por dia" onMouseLeave={() => setHover(null)} onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const i = Math.round(((e.clientX - r.left) / r.width) * (W) - pad.l) / (step || 1);
        setHover(Math.max(0, Math.min(points.length - 1, Math.round(i))));
      }}>
        <defs>
          <linearGradient id="mg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#d9a21b" stopOpacity=".45" />
            <stop offset="100%" stopColor="#d9a21b" stopOpacity=".02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={pad.l} x2={W - pad.r} y1={pad.t + g * (H - pad.t - pad.b)} y2={pad.t + g * (H - pad.t - pad.b)} stroke="#e8dcc3" strokeDasharray="3 4" />
        ))}
        <path d={area} fill="url(#mg)" />
        <path d={line} fill="none" stroke="#b9831a" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (i % every === 0 ? <text key={p.x} x={xy[i][0]} y={H - 6} textAnchor="middle" fontSize="11" fill="#8a7b69">{fmtDay(p.x)}</text> : null))}
        {hover !== null && xy[hover] && (
          <>
            <line x1={xy[hover][0]} x2={xy[hover][0]} y1={pad.t} y2={H - pad.b} stroke="#1f232b" strokeOpacity=".25" />
            <circle cx={xy[hover][0]} cy={xy[hover][1]} r="4.5" fill="#1f232b" />
          </>
        )}
      </svg>
      {hover !== null && points[hover] && (
        <div className="pointer-events-none absolute top-1 right-2 rounded-lg bg-[#1f232b] px-2.5 py-1 text-xs font-semibold text-white">
          {fmtDay(points[hover].x)} · {fmt(points[hover].y)}
        </div>
      )}
    </div>
  );
}

function Table({ title, rows, cols, map }: { title: string; rows: Record<string, number | string>[]; cols: [string, string][]; map: Record<string, string> }) {
  return (
    <section className={`${card} overflow-x-auto`}>
      <h3 className="font-title text-base font-semibold">{title}</h3>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[#8a7b69]">
            <th className="py-1 font-semibold">Tipo</th>
            {cols.map(([, h]) => (
              <th key={h} className="py-1 text-right font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.name)} className="border-t border-[#efe4cf]">
              <td className="py-1.5">{label(map, String(r.name))}</td>
              {cols.map(([k]) => (
                <td key={k} className="py-1.5 text-right tabular-nums">{nf(Number(r[k]) || 0)}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length + 1} className="py-2 text-[#8a7b69]">Sem dados ainda.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function Spark({ values }: { values: number[] }) {
  const v = [...values].reverse(); // do mais antigo ao mais recente
  const max = Math.max(1, ...v);
  return (
    <svg viewBox={`0 0 ${v.length * 6} 40`} className="h-12 w-full" preserveAspectRatio="none" aria-label="Atividade na última hora">
      {v.map((n, i) => (
        <rect key={i} x={i * 6 + 1} y={40 - (n / max) * 38} width="4" height={Math.max(1, (n / max) * 38)} rx="1" fill={n ? "#d9a21b" : "#efe4cf"} />
      ))}
    </svg>
  );
}

function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)} min` : `${Math.floor(s / 3600)} h`;
}

export default function MetricsPage() {
  const { session, loading } = useSession();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<"overview" | "growth" | "geral">("overview"); // visão geral (padrão), retenção e ativação, ou uso e tempo real
  const [m, setM] = useState<Metrics | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [metric, setMetric] = useState<keyof Day>("views");
  const [present, setPresent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    void getBrowserSupabase().rpc("is_admin").then(({ data }) => setAllowed(data === true));
  }, [session]);

  const loadMetrics = useCallback(async () => {
    const { data, error } = await getBrowserSupabase().rpc("admin_metrics", { p_days: days });
    if (error) return setErr("Não foi possível carregar as métricas.");
    setErr(null);
    setM(data as Metrics);
  }, [days]);
  useEffect(() => {
    if (!allowed) return;
    setM(null);
    void loadMetrics();
    const t = window.setInterval(() => document.visibilityState === "visible" && void loadMetrics(), 30_000);
    return () => window.clearInterval(t);
  }, [allowed, loadMetrics]);

  useEffect(() => {
    if (!allowed || tab !== "geral") return;
    const sb = getBrowserSupabase();
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      const { data } = await sb.rpc("admin_metrics_live");
      if (data) setLive(data as Live);
    };
    void load();
    const t = window.setInterval(() => void load(), ONLINE_NOW ? 2_000 : 30_000); // com o "online agora" ligado, atualiza a cada 2 s
    return () => window.clearInterval(t);
  }, [allowed, tab]);

  useEffect(() => {
    const h = () => setPresent(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  function togglePresent() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else {
      setPresent(true);
      void root.current?.requestFullscreen?.().catch(() => undefined);
    }
  }

  const chartDefs: { key: keyof Day; title: string; fmt: (n: number) => string }[] = [
    { key: "views", title: "Páginas vistas", fmt: nf },
    { key: "visitors", title: "Visitantes", fmt: nf },
    { key: "sessions", title: "Sessões", fmt: nf },
    { key: "active", title: "Usuários ativos", fmt: nf },
    { key: "signups", title: "Cadastros", fmt: nf },
    { key: "pins", title: "Pins criados", fmt: nf },
    { key: "pins_del", title: "Pins excluídos", fmt: nf },
    { key: "displays", title: "Displays colocados", fmt: nf },
    { key: "revenue", title: "Receita", fmt: brl },
  ];
  const def = chartDefs.find((c) => c.key === metric) ?? chartDefs[0];
  const points = useMemo(() => (m?.series ?? []).map((d) => ({ x: d.d, y: Number(d[metric]) || 0 })), [m, metric]);

  function exportCsv() {
    if (!m) return;
    const head = "data;paginas_vistas;visitantes;sessoes;usuarios_ativos;cadastros;pins_criados;pins_excluidos;displays_colocados;receita_reais";
    const lines = m.series.map((d) => [d.d, d.views, d.visitors, d.sessions, d.active, d.signups, d.pins, d.pins_del, d.displays, (d.revenue / 100).toFixed(2).replace(".", ",")].join(";"));
    const blob = new Blob(["﻿" + [head, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pinz-metricas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (loading || (session && allowed === null)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f6efe0]">
        <Spinner />
      </main>
    );
  }
  if (!session || !allowed) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f6efe0] p-6 text-center">
        <div>
          <p className="font-title text-xl font-semibold">Área restrita</p>
          <Link href={session ? "/" : loginUrl("/admin/metricas")} className="mt-4 inline-block cursor-pointer rounded-lg bg-[#1f232b] px-4 py-2 text-sm font-semibold text-white">
            {session ? "Voltar ao Pinz" : "Entrar"}
          </Link>
        </div>
      </main>
    );
  }

  const p = m?.period;
  const pv = m?.previous;
  const conv = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1).replace(".", ",")}%` : "—");

const NAV: { id: "overview" | "growth" | "geral"; label: string; icon: string }[] = [
  { id: "overview", label: "Visão geral", icon: "M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" },
  { id: "growth", label: "Retenção e ativação", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { id: "geral", label: "Uso e tempo real", icon: "M3 12h4l3-8 4 16 3-8h4" },
];

  const dr = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(/\./g, "");
  const startDate = days === 0 && m ? new Date(m.range.from) : new Date(Date.now() - (Math.max(days, 1) - 1) * 86400000);
  const rangeText = dr(startDate) + "  –  " + dr(new Date());

  return (
    <div ref={root} className={`min-h-dvh bg-[#6b4a2b] bg-cover bg-fixed text-[#2a1c12] print:bg-white ${present ? "overflow-y-auto p-3 text-[1.05rem]" : "p-2 sm:p-4"}`} style={{ backgroundImage: "linear-gradient(rgba(40,24,10,.35), rgba(40,24,10,.35)), url(/img/blur/cortica.webp)" }}>
      <div className="mx-auto flex max-w-[1560px] flex-col gap-3 lg:flex-row lg:gap-4">
        <aside className="flex shrink-0 flex-col rounded-3xl bg-[#fbf5ea]/95 p-3 shadow-[0_10px_40px_rgba(30,12,0,.35)] lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)] lg:w-56 lg:p-4 print:hidden">
          <div className="flex items-center justify-between gap-3 lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/pinz-logo.webp" alt="Pinz" className="h-10 w-auto select-none lg:mx-auto lg:mt-1 lg:h-14" draggable={false} />
            <Link href="/admin" className="text-xs font-semibold text-[#6b5440] underline lg:hidden">← Painel</Link>
          </div>
          <nav aria-label="Seções" className="mt-3 flex gap-1 overflow-x-auto lg:mt-6 lg:flex-col lg:overflow-visible">
            {NAV.map((n) => (
              <button key={n.id} type="button" onClick={() => setTab(n.id)} aria-current={tab === n.id ? "page" : undefined} className={`flex shrink-0 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-semibold whitespace-nowrap transition ${tab === n.id ? "bg-[#f3e3c6] text-[#2a1c12]" : "text-[#4a3826] hover:bg-[#f3e9d6]"}`}>
                <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={n.icon} />
                </svg>
                {n.label}
              </button>
            ))}
          </nav>
          <div className="mt-3 hidden flex-1 lg:block" />
          <div className="mt-3 flex flex-wrap gap-2 lg:flex-col">
            <button type="button" onClick={exportCsv} disabled={!m} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#e1d3ba] bg-white px-3 py-2.5 text-sm font-semibold text-[#2a1c12] transition hover:bg-[#f3e9d6] disabled:opacity-50">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3v12m0 0-4-4m4 4 4-4M4 20h16" />
              </svg>
              Exportar dados
            </button>
            <button type="button" onClick={() => window.print()} className="cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold text-[#6b5440] transition hover:bg-[#f3e9d6]">
              Imprimir / PDF
            </button>
            <button type="button" onClick={togglePresent} className="cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold text-[#6b5440] transition hover:bg-[#f3e9d6]">
              {present ? "Sair da apresentação" : "Modo apresentação"}
            </button>
            <Link href="/admin" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-[#6b5440] transition hover:bg-[#f3e9d6] lg:block">
              ← Painel do admin
            </Link>
          </div>
        </aside>

      <div className="min-w-0 flex-1 rounded-3xl bg-[#fbf5ea]/95 p-4 shadow-[0_10px_40px_rgba(30,12,0,.35)] sm:p-6 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-title text-3xl font-semibold sm:text-4xl">{tab === "growth" ? "Retenção e ativação" : tab === "geral" ? "Uso e tempo real" : "Growth"}</h1>
            <p className="text-[#6b5440]">{tab === "growth" ? "Quem chega, fica, volta e paga · dados próprios, sem rastreadores de terceiros" : tab === "geral" ? "Navegação, ferramentas e atividade ao vivo" : "Acompanhe o crescimento do PINZ em tempo real."}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <span className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold shadow-[0_2px_8px_rgba(90,60,20,.08)]">
              <svg viewBox="0 0 24 24" className="size-4 text-[#6b5440]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18M8 3v4M16 3v4" />
              </svg>
              {rangeText}
            </span>
            <div className="flex rounded-xl bg-white p-1 shadow-[0_2px_8px_rgba(90,60,20,.08)]" role="tablist" aria-label="Período">
              {PERIODS.map(([d, t]) => (
                <button key={d} type="button" role="tab" aria-selected={days === d} onClick={() => setDays(d)} className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition ${days === d ? "bg-[#4a3826] text-white" : "text-[#4a3826] hover:bg-[#f3e9d6]"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </header>

        {err && <p role="alert" className="mt-4 text-sm font-semibold text-[#a23b2a]">{err}</p>}

        {tab === "overview" && <OverviewView days={days} extra={m ? { pins_by_type: m.pins_by_type, devices: m.devices, referrers: m.referrers } : null} />}
        {tab === "growth" && <GrowthView days={days} />}

        {tab === "geral" && (
          <>
        {/* agora, em tempo real */}
        <section className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" aria-label="Agora">
          <div className={card}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#3ddc84] opacity-70" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-[#3ddc84]" />
                  </span>
                  {ONLINE_NOW ? "Online agora · tempo real" : "Hoje"}
                </p>
                {ONLINE_NOW ? (
                  <>
                    <p className="font-title mt-1 text-6xl leading-none font-semibold tabular-nums">{live ? nf(live.online) : "—"}</p>
                    <p className="mt-1 text-sm text-[#6b5440]">{live ? `${nf(live.online_logged)} logados · ${nf(live.online - live.online_logged)} visitantes` : ""}</p>
                  </>
                ) : (
                  <>
                    <p className="font-title mt-1 text-6xl leading-none font-semibold tabular-nums">{live ? nf(live.today_views) : "—"}</p>
                    <p className="mt-1 text-sm text-[#6b5440]">páginas vistas hoje</p>
                  </>
                )}
              </div>
              <div className="text-right text-sm text-[#6b5440]">
                {ONLINE_NOW && <p><b className="tabular-nums">{live ? nf(live.today_views) : "—"}</b> páginas vistas hoje</p>}
                <p><b className="tabular-nums">{live ? nf(live.today_sessions) : "—"}</b> sessões hoje</p>
              </div>
            </div>
            {live && live.online_pages.length > 0 && (
              <p className="mt-3 text-sm text-[#6b5440]">
                Onde estão: {live.online_pages.map((x) => `${x.name} (${x.value})`).join(" · ")}
                {live.online_devices.length > 0 && ` · ${live.online_devices.map((x) => `${label(DEVICE, x.name)} ${x.value}`).join(", ")}`}
              </p>
            )}
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold text-[#8a7b69]">Atividade na última hora (por minuto)</p>
              {live ? <Spark values={live.per_minute} /> : null}
            </div>
          </div>
          <div className={`${card} max-h-[22rem] overflow-y-auto`}>
            <p className="mb-2 text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">Acontecendo agora</p>
            {live && live.feed.length === 0 && <p className="text-sm text-[#8a7b69]">Nada por enquanto. Os próximos eventos aparecem aqui sozinhos.</p>}
            <ul className="space-y-1.5">
              {live?.feed.map((f, i) => (
                <li key={`${f.at}-${i}`} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    <b>{label(EVENT, f.name)}</b>
                    {f.detail && f.detail !== "/" ? <span className="text-[#6b5440]"> · {label({ ...PIN_TYPE, ...DISPLAY }, f.detail)}</span> : null}
                    {f.nick && !present ? <span className="text-[#8a7b69]"> · @{f.nick}</span> : null}
                  </span>
                  <span className="shrink-0 text-xs text-[#8a7b69] tabular-nums">{ago(f.at)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {!m || !p || !pv ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : (
          <>
            {/* números do período, com a comparação com o período anterior */}
            <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Período">
              <Kpi title="Visitantes" value={nf(p.visitors)} sub="sessões com navegação" cur={p.visitors} prev={pv.visitors} />
              <Kpi title="Sessões" value={nf(p.sessions)} sub={p.sessions ? `${(p.views / Math.max(1, p.sessions)).toFixed(1).replace(".", ",")} páginas por sessão` : undefined} cur={p.sessions} prev={pv.sessions} />
              <Kpi title="Páginas vistas" value={nf(p.views)} cur={p.views} prev={pv.views} />
              <Kpi title="Usuários ativos" value={nf(p.active_users)} sub={`DAU ${nf(m.totals.dau)} · WAU ${nf(m.totals.wau)} · MAU ${nf(m.totals.mau)}`} cur={p.active_users} prev={pv.active_users} />
              <Kpi title="Novos cadastros" value={nf(p.signups)} sub={`${nf(m.totals.users)} contas no total`} cur={p.signups} prev={pv.signups} />
              <Kpi title="Pins criados" value={nf(p.pins)} sub={`${nf(p.pins_del)} excluídos · ${nf(m.totals.pins)} no total`} cur={p.pins} prev={pv.pins} />
              <Kpi title="Displays colocados" value={nf(p.displays)} sub={`${nf(p.displays_del)} removidos · ${nf(m.totals.displays)} no ar`} />
              <Kpi title="Receita" value={brl(p.revenue_cents)} sub={`${nf(p.orders)} pedidos · ${nf(p.payers)} pagantes`} cur={p.revenue_cents} prev={pv.revenue_cents} />
            </section>

            <section className={`${card} mt-3`} aria-label="Evolução">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-title text-lg font-semibold">Evolução por dia</h2>
                <div className="flex flex-wrap gap-1.5 print:hidden">
                  {chartDefs.map((c) => (
                    <button key={c.key} type="button" onClick={() => setMetric(c.key)} className={chip(metric === c.key)}>
                      {c.title}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-sm text-[#6b5440]">{def.title}</p>
              <AreaChart points={points} fmt={def.fmt} />
            </section>

            <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Totais">
              <Kpi title="Murais" value={nf(m.totals.murals)} />
              <Kpi title="Pins no ar" value={nf(m.totals.pins)} />
              <Kpi title="Seguidores (conexões)" value={nf(m.totals.follows)} />
              <Kpi title="Assinantes PINZ+" value={nf(m.totals.plus)} />
              <Kpi title="Bottons colocados" value={nf(m.totals.badges)} />
              <Kpi title="Reações" value={nf(m.totals.reactions)} />
              <Kpi title="Visitas a murais" value={nf(m.totals.mural_visits)} sub="histórico completo" />
              <Kpi title="Receita total" value={brl(m.totals.revenue_cents)} sub={`${nf(m.totals.orders)} pedidos · ${nf(p.credits_spent)} créditos gastos no período`} />
            </section>

            <section className="mt-3 grid gap-3 lg:grid-cols-2" aria-label="Pins e displays">
              <Table title="Pins por tipo" rows={m.pins_by_type} cols={[["total", "No ar"], ["created", "Criados"], ["deleted", "Excluídos"]]} map={PIN_TYPE} />
              <Table title="Displays por tipo" rows={m.displays_by_product} cols={[["total", "No ar"], ["placed", "Colocados"], ["removed", "Removidos"]]} map={DISPLAY} />
            </section>

            <section className="mt-3 grid gap-3 lg:grid-cols-3" aria-label="Uso">
              <Bars title="Ferramentas mais usadas" rows={m.tools} map={TOOL} />
              <Bars title="Páginas mais vistas" rows={m.top_pages} />
              <Bars title="De onde vêm" rows={m.referrers} />
              <Bars title="Dispositivos" rows={m.devices} map={DEVICE} />
              <Bars title="Idiomas" rows={m.languages} />
              <Bars title="Fusos horários (região aproximada)" rows={m.timezones} />
            </section>

            <section className="mt-3 grid gap-3 lg:grid-cols-2" aria-label="Funil e horários">
              <div className={card}>
                <h3 className="font-title text-base font-semibold">Funil do período</h3>
                <ul className="mt-3 space-y-3 text-sm">
                  {[
                    ["Sessões", m.funnel.sessions, null],
                    ["Cadastros", m.funnel.signups, conv(m.funnel.signups, m.funnel.sessions) + " das sessões"],
                    ["Criaram o primeiro pin", m.funnel.with_pin, conv(m.funnel.with_pin, m.funnel.signups) + " dos cadastros"],
                    ["Compraram", m.funnel.payers, conv(m.funnel.payers, m.funnel.signups) + " dos cadastros"],
                  ].map(([t, n, s]) => (
                    <li key={String(t)}>
                      <div className="flex justify-between">
                        <span>{t}</span>
                        <span className="font-semibold tabular-nums">{nf(Number(n))}{s ? <span className="font-normal text-[#8a7b69]"> · {s}</span> : null}</span>
                      </div>
                      <div className="mt-0.5 h-2 rounded-full bg-[#efe4cf]">
                        <div className="h-full rounded-full bg-[#1f232b]" style={{ width: `${Math.max(2, (Number(n) / Math.max(1, m.funnel.sessions, m.funnel.signups)) * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={card}>
                <h3 className="font-title text-base font-semibold">Horários de maior acesso (Brasília)</h3>
                <div className="mt-3 flex h-36 items-end gap-1">
                  {m.hours.map((n, h) => (
                    <div key={h} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${h}h: ${nf(n)} páginas vistas`}>
                      <div className="w-full rounded-t bg-[#d9a21b]" style={{ height: `${(n / Math.max(1, ...m.hours)) * 100}%`, minHeight: n ? 3 : 1, opacity: n ? 1 : 0.25 }} />
                      <span className="text-[10px] text-[#8a7b69]">{h % 3 === 0 ? h : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <p className="mt-6 text-xs text-[#8a7b69]">
              Como ler: visitantes e sessões contam navegações a partir da data em que a medição entrou no ar. Cadastros, pins, murais e seguidores têm histórico completo (vêm do próprio banco). Pins excluídos só contam a partir da medição; apagar um mural inteiro não conta como exclusão de pins. Sem IP, sem cookies e sem rastreadores externos.
            </p>
          </>
        )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}
