"use client";

import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui";
import { getBrowserSupabase } from "@/lib/supabase";

type Totals = { users: number; sessions: number; views: number };
type Item = { name: string; value: number };
type Report = { configured: true; days: 7 | 30; totals: { today: Totals; week: Totals; month: Totals }; pages: Item[]; events: Item[]; countries: Item[]; devices: Item[]; fetchedAt: string };
type State = { kind: "loading" } | { kind: "missing"; missing: string[] } | { kind: "error"; text: string } | { kind: "ok"; data: Report };

const EVENT_LABEL: Record<string, string> = {
  page_view: "Páginas vistas",
  session_start: "Sessões iniciadas",
  first_visit: "Primeiras visitas",
  user_engagement: "Tempo de uso",
  scroll: "Rolagens",
  click: "Cliques",
};
const DEVICE_LABEL: Record<string, string> = { desktop: "Computador", mobile: "Celular", tablet: "Tablet" };
const nf = (n: number) => n.toLocaleString("pt-BR");

const card = "rounded-2xl border border-[#e1d3ba] bg-white/70 p-4";

function Stat({ label, t }: { label: string; t: Totals }) {
  return (
    <div className={card}>
      <p className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">{label}</p>
      <p className="font-title mt-1 text-3xl font-semibold">{nf(t.users)}</p>
      <p className="text-xs text-[#6b5440]">usuários ativos</p>
      <p className="mt-2 text-xs text-[#6b5440]">
        {nf(t.sessions)} sessões · {nf(t.views)} páginas vistas
      </p>
    </div>
  );
}

function Top({ title, rows, label }: { title: string; rows: Item[]; label?: (n: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className={card} aria-label={title}>
      <h3 className="font-title text-base font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-[#6b5440]">Sem dados ainda.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.map((r) => (
            <li key={r.name} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{label ? label(r.name) : r.name}</span>
                <span className="shrink-0 font-semibold tabular-nums">{nf(r.value)}</span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-[#efe4cf]">
                <div className="h-full rounded-full bg-[#d98a2b]" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Painel de analytics (Google Analytics 4) para o administrador. Sem configuração, mostra o que falta. */
export function AnalyticsPanel() {
  const [days, setDays] = useState<7 | 30>(7);
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async (d: 7 | 30) => {
    setState({ kind: "loading" });
    const { data } = await getBrowserSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return setState({ kind: "error", text: "Sessão expirada. Entre de novo." });
    try {
      const res = await fetch(`/api/admin/analytics?days=${d}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) return setState({ kind: "error", text: res.status === 502 ? "O Google Analytics não respondeu. Confira a chave da conta de serviço e o acesso à propriedade." : "Não foi possível carregar agora." });
      if (body.configured === false) return setState({ kind: "missing", missing: body.missing ?? [] });
      setState({ kind: "ok", data: body as Report });
    } catch {
      setState({ kind: "error", text: "Não foi possível carregar agora." });
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  if (state.kind === "loading")
    return (
      <div className="py-10">
        <Spinner />
      </div>
    );

  if (state.kind === "missing")
    return (
      <section className={`${card} mt-4`} aria-label="Analytics não configurado">
        <h2 className="font-title text-lg font-semibold">Analytics ainda não configurado</h2>
        <p className="mt-1 text-sm text-[#4a3826]">A página está pronta. Falta ligar o Google Analytics 4 (as chaves ficam só no servidor):</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {state.missing.map((m) => (
            <li key={m}>
              <code className="rounded bg-[#efe4cf] px-1.5 py-0.5 text-[13px]">{m}</code>{" "}
              <span className="text-[#6b5440]">{m === "GA4_PROPERTY_ID" ? "— ID numérico da propriedade do GA4" : "— chave (JSON) da conta de serviço com acesso de Leitor à propriedade"}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[#8a7b69]">Depois de configurar, os números aparecem aqui (o Google leva de algumas horas a um dia para processar as visitas).</p>
      </section>
    );

  if (state.kind === "error")
    return (
      <section className={`${card} mt-4`} role="alert">
        <p className="text-sm text-[#a23b2a]">{state.text}</p>
        <button type="button" onClick={() => void load(days)} className="mt-3 cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-2 text-sm font-semibold text-[#4a3826] hover:bg-white">
          Tentar de novo
        </button>
      </section>
    );

  const d = state.data;
  return (
    <section className="mt-4 space-y-4" aria-label="Analytics">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Hoje" t={d.totals.today} />
        <Stat label="Últimos 7 dias" t={d.totals.week} />
        <Stat label="Últimos 30 dias" t={d.totals.month} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#8a7b69]">Detalhes dos últimos {d.days} dias · atualizado às {new Date(d.fetchedAt).toLocaleTimeString("pt-BR", { timeStyle: "short" })}</p>
        <div role="group" aria-label="Período" className="inline-flex rounded-xl border border-[#e1d3ba] bg-white/60 p-0.5">
          {([7, 30] as const).map((n) => (
            <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)} className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold ${days === n ? "bg-[#1f232b] text-white" : "text-[#4a3826] hover:bg-[#efe4cf]"}`}>
              {n} dias
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Top title="Páginas mais vistas" rows={d.pages} />
        <Top title="Eventos mais frequentes" rows={d.events} label={(n) => EVENT_LABEL[n] ?? n} />
        <Top title="Países" rows={d.countries} />
        <Top title="Dispositivos" rows={d.devices} label={(n) => DEVICE_LABEL[n] ?? n} />
      </div>
    </section>
  );
}
