"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui";
import { card, Kpi, nf } from "./parts";

type Bucket = { t: string; total: number; bad: number; avg_ms: number | null };
type Summary = {
  last_check: { at: string; ok: boolean; status_code: number | null; latency_ms: number | null; reason: string | null } | null;
  uptime_24h: number | null;
  uptime_7d: number | null;
  uptime_30d: number | null;
  avg_latency_ms_24h: number | null;
  incidents_24h: number;
  last_incident: { at: string; reason: string | null; status_code: number | null } | null;
  monitored_since: string | null;
};
type Hist = { summary: Summary; since: string | null; checks_total: number; p95_ms_24h: number | null; max_ms_24h: number | null; hourly: Bucket[]; daily: Bucket[]; incidents: { at: string; reason: string | null; status_code: number | null; latency_ms: number | null }[] };
type Errs = { last_24h: number; last_1h: number; rows: { id: number; source: "client" | "server"; area: string; message: string; stack: string | null; path: string | null; n: number; first_at: string; last_at: string }[] };
type Live = {
  status: "ok" | "degraded" | "down";
  reasons: string[];
  checkedAt: string;
  server: { startedAt: string; uptimeSeconds: number; uptime: string; node: string };
  checks: { database: { ok: boolean; ms: number; reason?: string }; images: { ok: boolean; ms: number; reason?: string } };
};

const STATE = {
  ok: { label: "Tudo funcionando", sub: "O Pinz está no ar e todos os serviços respondem.", dot: "bg-[#2f8f4e]", box: "border-[#bfe0c7] bg-[#eaf7ee]", text: "text-[#1f6b39]" },
  degraded: { label: "Funcionando com ressalvas", sub: "O site responde, mas uma parte dele está fora do ar.", dot: "bg-[#d9a21b]", box: "border-[#ecd9a0] bg-[#fff6dd]", text: "text-[#8a6410]" },
  down: { label: "Fora do ar", sub: "O site não consegue usar o banco de dados.", dot: "bg-[#c0392b]", box: "border-[#e3b3a8] bg-[#fbeae5]", text: "text-[#a23b2a]" },
} as const;

const pct = (n: number | null | undefined) => (n == null ? "—" : `${n.toFixed(n >= 99.95 ? 2 : 3).replace(".", ",")}%`);
const ms = (n: number | null | undefined) => (n == null ? "—" : `${nf(n)} ms`);
const dayTone = (b: Bucket | undefined) => {
  if (!b || b.total === 0) return "#e4d9c4";
  const p = (100 * (b.total - b.bad)) / b.total;
  return p >= 99.9 ? "#3aa655" : p >= 99 ? "#d9a21b" : "#d4574a";
};
const dayPct = (b: Bucket) => ((100 * (b.total - b.bad)) / Math.max(1, b.total)).toFixed(2).replace(".", ",") + "%";
const fdt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const fday = (iso: string) => new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const ago = (iso: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 90) return "agora há pouco";
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  return `há ${Math.round(s / 86400)} dias`;
};
const dur = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`);

/** Estado ao vivo (a rota pública /api/status) + histórico medido de fora pelo banco (a cada minuto). */
export function useUptime(everyMs: number) {
  const [hist, setHist] = useState<Hist | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [errs, setErrs] = useState<Errs | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    void getBrowserSupabase().rpc("admin_errors").then(({ data }) => data && setErrs(data as Errs));
    const [h, l] = await Promise.all([getBrowserSupabase().rpc("admin_uptime"), fetch("/api/status", { cache: "no-store" }).then((r) => r.json() as Promise<Live>).catch(() => null)]);
    if (h.error) setErr("Não foi possível carregar o histórico de disponibilidade.");
    else {
      setErr(null);
      setHist(h.data as Hist);
    }
    setLive(l);
  }, []);
  useEffect(() => {
    void load();
    const t = window.setInterval(() => document.visibilityState === "visible" && void load(), everyMs);
    return () => window.clearInterval(t);
  }, [load, everyMs]);
  return { hist, live, errs, err };
}

function Pill({ status }: { status: Live["status"] | "unknown" }) {
  const s = status === "unknown" ? null : STATE[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${s ? `${s.box} ${s.text}` : "border-[#d9c9ad] bg-white/70 text-[#6b5440]"}`}>
      <span className={`size-2.5 rounded-full ${s ? s.dot : "bg-[#8a7b69]"} ${status === "ok" ? "animate-pulse" : ""}`} />
      {s ? s.label : "Verificando…"}
    </span>
  );
}

/** Card do painel Growth: resumo e atalho para a página completa. */
export function UptimeCard() {
  const { hist, live, err } = useUptime(60_000);
  const s = hist?.summary;
  const last30 = (hist?.daily ?? []).slice(-30);
  return (
    <section className={card} aria-label="Disponibilidade do servidor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-title text-lg font-semibold">Servidor</h2>
          <Pill status={live?.status ?? "unknown"} />
        </div>
        <Link href="/admin/status" className="text-sm font-semibold text-[#4a3826] underline">
          Ver detalhes →
        </Link>
      </div>
      {err && <p role="alert" className="mt-2 text-sm font-semibold text-[#a23b2a]">{err}</p>}
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[
          ["Disponível (24 h)", pct(s?.uptime_24h)],
          ["Disponível (30 dias)", pct(s?.uptime_30d)],
          ["Resposta média (24 h)", ms(s?.avg_latency_ms_24h)],
          ["No ar desde o último deploy", live ? live.server.uptime : "—"],
        ].map(([t, v]) => (
          <div key={t} className="rounded-xl bg-[#f6efe0] p-3">
            <dt className="text-xs text-[#6b5440]">{t}</dt>
            <dd className="font-title mt-0.5 text-xl font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex h-6 items-end gap-[2px]" aria-hidden>
        {last30.map((b) => (
          <span key={b.t} title={`${fday(b.t)}: ${dayPct(b)}`} className="h-full flex-1 rounded-[3px]" style={{ background: dayTone(b) }} />
        ))}
      </div>
      <p className="mt-1 text-xs text-[#8a7b69]">Últimos 30 dias, um traço por dia (verde = sem falhas).</p>
    </section>
  );
}

function Strip({ rows, count, label: lb, when }: { rows: Bucket[]; count: number; label: (b: Bucket) => string; when: (t: string) => string }) {
  const slots: (Bucket | undefined)[] = Array.from({ length: count }, (_, i) => rows[rows.length - count + i]);
  return (
    <div className="flex h-12 items-end gap-[3px]" role="img" aria-label="Disponibilidade por período">
      {slots.map((b, i) => (
        <span key={i} title={b ? `${when(b.t)}\n${lb(b)}` : "Sem medição"} className="h-full flex-1 rounded-[4px] transition hover:opacity-70" style={{ background: dayTone(b) }} />
      ))}
    </div>
  );
}

function Latency({ rows }: { rows: Bucket[] }) {
  const pts = rows.filter((r) => r.avg_ms != null);
  if (pts.length < 2) return <p className="mt-3 text-sm text-[#8a7b69]">Ainda sem medições suficientes.</p>;
  const W = 820;
  const H = 200;
  const pad = { l: 40, r: 8, t: 12, b: 24 };
  const max = Math.max(100, ...pts.map((p) => p.avg_ms ?? 0)) * 1.15;
  const x = (i: number) => pad.l + (i / (rows.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const line = rows.map((r, i) => (r.avg_ms == null ? null : `${x(i).toFixed(1)},${y(r.avg_ms).toFixed(1)}`)).filter(Boolean).join(" ");
  const area = `${x(0)},${H - pad.b} ${line} ${x(rows.length - 1)},${H - pad.b}`;
  const grid = [0, 0.5, 1].map((f) => Math.round(max * f));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-52 w-full" role="img" aria-label="Tempo de resposta por hora">
      {grid.map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="#e8dcc4" />
          <text x={pad.l - 6} y={y(g) + 3} textAnchor="end" fontSize="10" fill="#8a7b69">{g} ms</text>
        </g>
      ))}
      <polygon points={area} fill="#3aa655" opacity="0.12" />
      <polyline points={line} fill="none" stroke="#2f8f4e" strokeWidth="2" strokeLinejoin="round" />
      {rows.map((r, i) =>
        r.avg_ms == null ? null : (
          <circle key={r.t} cx={x(i)} cy={y(r.avg_ms)} r="6" fill="transparent">
            <title>{`${fdt(r.t)}: ${ms(r.avg_ms)}`}</title>
          </circle>
        ),
      )}
      {[0, Math.floor(rows.length / 2), rows.length - 1].map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === rows.length - 1 ? "end" : "middle"} fontSize="10" fill="#8a7b69">
          {new Date(rows[i].t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
        </text>
      ))}
    </svg>
  );
}

/** Agrupa falhas seguidas (checagens a cada minuto) em um único incidente. */
function groupIncidents(list: Hist["incidents"]) {
  const out: { start: string; end: string; n: number; reason: string | null }[] = [];
  for (const i of [...list].sort((a, b) => +new Date(a.at) - +new Date(b.at))) {
    const prev = out[out.length - 1];
    if (prev && +new Date(i.at) - +new Date(prev.end) <= 150_000) {
      prev.end = i.at;
      prev.n += 1;
    } else out.push({ start: i.at, end: i.at, n: 1, reason: i.reason });
  }
  return out.reverse();
}

function Service({ name, hint, ok, ms: t, reason }: { name: string; hint: string; ok: boolean | null; ms?: number; reason?: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-[#f6efe0] p-3">
      <span className={`size-3 shrink-0 rounded-full ${ok === null ? "bg-[#8a7b69]" : ok ? "bg-[#2f8f4e]" : "bg-[#c0392b]"}`} />
      <span className="min-w-0 flex-1">
        <b className="block text-sm">{name}</b>
        <span className="block truncate text-xs text-[#6b5440]">{ok === false && reason ? reason : hint}</span>
      </span>
      <span className="text-sm font-semibold tabular-nums">{t == null ? "—" : `${nf(t)} ms`}</span>
    </li>
  );
}

/** Página inteira de disponibilidade do servidor (só o administrador). */
export function UptimeView() {
  const { hist, live, errs, err } = useUptime(15_000);
  if (!hist && !err) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner />
      </div>
    );
  }
  const st = live ? STATE[live.status] : null;
  const s = hist?.summary;
  const inc = groupIncidents(hist?.incidents ?? []);
  return (
    <div className="mt-5 space-y-3">
      {err && <p role="alert" className="text-sm font-semibold text-[#a23b2a]">{err}</p>}

      <section className={`flex flex-wrap items-center gap-4 rounded-2xl border p-5 ${st ? st.box : "border-[#d9c9ad] bg-white/70"}`} aria-live="polite">
        <span className={`size-5 shrink-0 rounded-full ${st ? st.dot : "bg-[#8a7b69]"} ${live?.status === "ok" ? "animate-pulse" : ""}`} />
        <div className="min-w-0 flex-1">
          <p className={`font-title text-2xl font-semibold ${st ? st.text : ""}`}>{st ? st.label : "Sem resposta da rota de estado"}</p>
          <p className="text-sm text-[#4a3826]">{live?.reasons.length ? live.reasons.join(" · ") : st ? st.sub : "Não consegui consultar /api/status agora."}</p>
        </div>
        {s?.last_check && <p className="text-xs text-[#6b5440]">Última checagem externa: {ago(s.last_check.at)}</p>}
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Disponibilidade">
        <Kpi title="Disponível (24 h)" value={pct(s?.uptime_24h)} sub={`${s?.incidents_24h ?? 0} ${s?.incidents_24h === 1 ? "falha" : "falhas"} nas últimas 24 h`} />
        <Kpi title="Disponível (7 dias)" value={pct(s?.uptime_7d)} sub="checagens a cada minuto" />
        <Kpi title="Disponível (30 dias)" value={pct(s?.uptime_30d)} sub={hist?.since ? `medido desde ${fday(hist.since)}` : undefined} />
        <Kpi title="No ar desde o último deploy" value={live ? live.server.uptime : "—"} sub={live ? `desde ${fdt(live.server.startedAt)} · Node ${live.server.node}` : undefined} />
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]" aria-label="Serviços e velocidade">
        <div className={card}>
          <h2 className="font-title text-lg font-semibold">Serviços agora</h2>
          <ul className="mt-3 space-y-2">
            <Service name="Site" hint="Resposta medida de fora, pelo banco de dados" ok={s?.last_check ? s.last_check.ok : null} ms={s?.last_check?.latency_ms ?? undefined} reason={s?.last_check?.reason ?? undefined} />
            <Service name="Banco de dados" hint="Supabase" ok={live ? live.checks.database.ok : null} ms={live?.checks.database.ms} reason={live?.checks.database.reason} />
            <Service name="Verificador de imagens" hint="Moderação de fotos enviadas" ok={live ? live.checks.images.ok : null} ms={live?.checks.images.ms} reason={live?.checks.images.reason} />
          </ul>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ["Média 24 h", ms(s?.avg_latency_ms_24h)],
              ["95% abaixo de", ms(hist?.p95_ms_24h)],
              ["Pior 24 h", ms(hist?.max_ms_24h)],
            ].map(([t, v]) => (
              <div key={t} className="rounded-xl bg-[#f6efe0] p-2">
                <dt className="text-[11px] text-[#6b5440]">{t}</dt>
                <dd className="font-title text-lg font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className={card}>
          <h2 className="font-title text-lg font-semibold">Tempo de resposta</h2>
          <p className="text-sm text-[#6b5440]">Média por hora, últimas 48 horas</p>
          <Latency rows={hist?.hourly ?? []} />
        </div>
      </section>

      <section className={card} aria-label="Últimas 48 horas">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-title text-lg font-semibold">Últimas 48 horas</h2>
          <p className="text-xs text-[#6b5440]">um traço por hora</p>
        </div>
        <div className="mt-3">
          <Strip rows={hist?.hourly ?? []} count={48} when={fdt} label={(b) => `${dayPct(b)} · ${b.bad} ${b.bad === 1 ? "falha" : "falhas"} em ${b.total} checagens`} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-[#8a7b69]">
          <span>48 h atrás</span>
          <span>agora</span>
        </div>
      </section>

      <section className={card} aria-label="Últimos 90 dias">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-title text-lg font-semibold">Últimos 90 dias</h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6b5440]">
            {[
              ["#3aa655", "99,9% ou mais"],
              ["#d9a21b", "99% a 99,9%"],
              ["#d4574a", "abaixo de 99%"],
              ["#e4d9c4", "sem medição"],
            ].map(([c, t]) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: c }} />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-3">
          <Strip rows={hist?.daily ?? []} count={90} when={fday} label={(b) => `${dayPct(b)} · ${b.bad} ${b.bad === 1 ? "falha" : "falhas"} em ${b.total} checagens`} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-[#8a7b69]">
          <span>90 dias atrás</span>
          <span>hoje</span>
        </div>
      </section>

      <section className={card} aria-label="Incidentes">
        <h2 className="font-title text-lg font-semibold">Incidentes recentes</h2>
        {inc.length === 0 ? (
          <p className="mt-2 text-sm text-[#2f8f4e]">Nenhuma falha registrada. 🎉</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#efe4cf]">
            {inc.map((i) => (
              <li key={i.start} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-2.5 text-sm">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-[#c0392b]" />
                <span className="min-w-0 flex-1">
                  <b>{i.n === 1 ? "1 checagem falhou" : `${i.n} checagens seguidas falharam`}</b>
                  <span className="block text-xs break-words text-[#6b5440]">{i.reason ?? "sem detalhe"}</span>
                </span>
                <span className="text-right text-xs text-[#6b5440]">
                  {fdt(i.start)}
                  <span className="block">{i.n > 1 ? `cerca de ${dur(i.n)}` : "menos de 1 min"}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card} aria-label="Erros registrados">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-title text-lg font-semibold">Erros registrados</h2>
          <p className="text-sm text-[#6b5440]">
            <b className="tabular-nums">{nf(errs?.last_1h ?? 0)}</b> na última hora · <b className="tabular-nums">{nf(errs?.last_24h ?? 0)}</b> em 24 h
          </p>
        </div>
        {!errs || errs.rows.length === 0 ? (
          <p className="mt-2 text-sm text-[#2f8f4e]">Nenhum erro registrado. 🎉</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#efe4cf]">
            {errs.rows.map((e) => (
              <li key={e.id} className="py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${e.area.startsWith("pay") ? "bg-[#fbeae5] text-[#a23b2a]" : e.source === "server" ? "bg-[#fff6dd] text-[#8a6410]" : "bg-[#eef1f7] text-[#3b4a6b]"}`}>
                    {e.source === "server" ? "servidor" : "navegador"} · {e.area}
                  </span>
                  {e.n > 1 && <span className="text-xs font-semibold text-[#6b5440]">×{nf(e.n)}</span>}
                  <span className="ml-auto text-xs text-[#6b5440]">{ago(e.last_at)}</span>
                </div>
                <p className="mt-1 break-words">{e.message}</p>
                {e.path && <p className="text-xs text-[#8a7b69]">em {e.path}</p>}
                {e.stack && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-[#6b5440]">ver detalhe técnico</summary>
                    <pre className="mt-1 overflow-x-auto rounded-lg bg-[#f6efe0] p-2 text-[11px] whitespace-pre-wrap">{e.stack}</pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="pb-2 text-xs text-[#8a7b69]">
        Como ler: o banco de dados visita o site a cada minuto e anota se respondeu (e em quanto tempo); por isso ele registra até as quedas em que o próprio site não pôde falar. O “no ar desde o último deploy” volta a zero a cada atualização do site e não conta como queda. Guardamos 90 dias de histórico de disponibilidade e 30 dias de erros. Se o site cair por 2 minutos seguidos, ou se houver erro em pagamento, você recebe um e-mail. A rota pública com os mesmos dados em JSON é <code>/api/status</code>.
      </p>
    </div>
  );
}
