"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui";
import { Bars, brl, card, Delta, Kpi, nf, type Item } from "./parts";

type Wk = { wk: string; active: number; new: number; retained: number; resurrected: number; churned: number; signups: number; creators: number };
type Cohort = { wk: string; size: number; ret: (number | null)[] };
type G = {
  range: { from: string; days: number };
  weeks: Wk[];
  cohorts: Cohort[];
  activation: { signups: number; prev_signups: number; pin7: number; badge7: number; follow7: number; activated: number; back7: number; median_hours_to_first_pin: number | null };
  acquisition: { organic: number; referred: number; top_referrers: Item[]; locales: Item[]; sources: Item[]; shares: number };
  monetization: { users: number; payers: number; repeat_payers: number; revenue_cents: number; revenue_period_cents: number; first_buys_period: number; plus_active: number; plus_ended_period: number; median_days_to_buy: number | null; by_kind: Item[] };
  engagement: { dau: number; wau: number; mau: number; avg_days_30: number | null; creators_30: number; users: number };
  generated_at: string;
};

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
const pctText = (a: number, b: number) => (b > 0 ? `${pct(a, b).toFixed(pct(a, b) < 10 ? 1 : 0).replace(".", ",")}%` : "—");
const KIND: Record<string, string> = { credits: "Créditos", plus: "PINZ+ (assinatura)", gift: "Presentes de PINZ+", plus_once: "PINZ+ (avulso)" };
const dm = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

/** Contabilidade do crescimento: quem chegou, quem ficou, quem voltou (para cima) e quem saiu (para baixo), semana a semana. */
function AccountingChart({ weeks }: { weeks: Wk[] }) {
  const W = 820;
  const H = 250;
  const pad = { l: 28, r: 8, t: 14, b: 26 };
  const up = Math.max(1, ...weeks.map((w) => w.new + w.retained + w.resurrected));
  const down = Math.max(0, ...weeks.map((w) => w.churned));
  const span = up + down;
  const zero = pad.t + (up / span) * (H - pad.t - pad.b);
  const k = (H - pad.t - pad.b) / span;
  const slot = (W - pad.l - pad.r) / Math.max(1, weeks.length);
  const bw = slot * 0.6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-60 w-full" role="img" aria-label="Contabilidade do crescimento por semana">
      <line x1={pad.l} x2={W - pad.r} y1={zero} y2={zero} stroke="#cdbb97" />
      {weeks.map((w, i) => {
        const x = pad.l + i * slot + (slot - bw) / 2;
        const partial = i === weeks.length - 1;
        let y = zero;
        const seg = (n: number, fill: string, key: string) => {
          const h = n * k;
          y -= h;
          return h > 0 ? <rect key={key} x={x} y={y} width={bw} height={h} fill={fill} opacity={partial ? 0.55 : 1} rx="2" /> : null;
        };
        return (
          <g key={w.wk}>
            <title>{`Semana de ${dm(w.wk)}${partial ? " (em andamento)" : ""}\nNovos: ${w.new}\nRetidos: ${w.retained}\nRecuperados: ${w.resurrected}\nPerdidos: ${w.churned}\nAtivos: ${w.active}`}</title>
            {seg(w.retained, "#4f7fd1", "r")}
            {seg(w.resurrected, "#d9a21b", "z")}
            {seg(w.new, "#3aa655", "n")}
            {w.churned > 0 && <rect x={x} y={zero} width={bw} height={w.churned * k} fill="#d4574a" opacity={partial ? 0.45 : 0.9} rx="2" />}
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#8a7b69">{dm(w.wk)}</text>
          </g>
        );
      })}
      <text x={4} y={pad.t + 8} fontSize="10" fill="#8a7b69">{nf(up)}</text>
      {down > 0 && <text x={4} y={H - pad.b - 2} fontSize="10" fill="#8a7b69">-{nf(down)}</text>}
    </svg>
  );
}

/** Retenção por coorte: de cada grupo de cadastros da mesma semana, quantos voltaram a ser ativos em cada semana seguinte. */
function CohortTable({ cohorts }: { cohorts: Cohort[] }) {
  const cols = Array.from({ length: 8 }, (_, i) => i);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="text-xs text-[#8a7b69]">
            <th className="py-1 text-left font-semibold">Entraram na semana de</th>
            <th className="py-1 text-right font-semibold">Pessoas</th>
            {cols.map((c) => (
              <th key={c} className="py-1 text-center font-semibold">{c === 0 ? "S0" : `S+${c}`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.wk} className="border-t border-[#efe4cf]">
              <td className="py-1.5">{dm(c.wk)}</td>
              <td className="py-1.5 text-right tabular-nums">{c.size}</td>
              {cols.map((i) => {
                const v = c.ret[i];
                if (v === null || v === undefined || c.size === 0) return <td key={i} className="py-1.5 text-center text-[#cdbb97]">·</td>;
                const p = pct(v, c.size);
                return (
                  <td key={i} className="p-0.5 text-center">
                    <div className="rounded-md py-1 text-xs font-semibold tabular-nums" style={{ background: `rgba(58,166,85,${0.08 + (p / 100) * 0.7})`, color: p > 55 ? "#fff" : "#2a1c12" }} title={`${v} de ${c.size}`}>
                      {Math.round(p)}%
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-[#8a7b69]">S0 é a semana do cadastro; S+1 é a semana seguinte, e assim por diante. “Ativo” = entrou, navegou ou criou algo naquela semana. Células com “·” ainda não aconteceram.</p>
    </div>
  );
}

type Insight = { tone: "bad" | "warn" | "ok" | "info"; title: string; text: string };

function insights(g: G, done: Wk[], quick: number | null): Insight[] {
  const out: Insight[] = [];
  const a = g.activation;
  const m = g.monetization;
  const e = g.engagement;
  if (e.users < 50) out.push({ tone: "info", title: "Poucos dados ainda", text: `Com ${nf(e.users)} pessoas, um único usuário muda os percentuais. Use as tendências com cautela e olhe os números absolutos.` });
  if (a.signups >= 3 && pct(a.activated, a.signups) < 60) out.push({ tone: "bad", title: "Ativação baixa", text: `Só ${pctText(a.activated, a.signups)} dos cadastros do período colocam o primeiro pin ou botton em até 7 dias. Encurte o caminho até o primeiro pin: tour, mural de exemplo, convite ao primeiro pin logo após o cadastro.` });
  else if (a.signups >= 3) out.push({ tone: "ok", title: "Boa ativação", text: `${pctText(a.activated, a.signups)} dos cadastros ativam em 7 dias. Mantenha o onboarding e teste melhorar o tempo até o primeiro pin${a.median_hours_to_first_pin != null ? ` (hoje, mediana de ${String(a.median_hours_to_first_pin).replace(".", ",")} h)` : ""}.` });
  const last = [...g.cohorts].reverse().find((c) => c.size >= 2 && c.ret[1] !== null && c.ret[1] !== undefined);
  if (last && pct(last.ret[1] ?? 0, last.size) < 30) out.push({ tone: "warn", title: "Poucos voltam na semana seguinte", text: `Na turma de ${dm(last.wk)}, só ${pctText(last.ret[1] ?? 0, last.size)} voltou em S+1. Lembretes de hábito, notificações de reação e e-mail “seu mural recebeu um pin” trazem a pessoa de volta.` });
  if (quick !== null && quick < 1 && done.length >= 2) out.push({ tone: "bad", title: "Saindo mais gente do que entrando", text: `O índice de crescimento (novos + recuperados ÷ perdidos) das últimas semanas é ${quick.toFixed(1).replace(".", ",")}: abaixo de 1, a base ativa encolhe.` });
  else if (quick !== null && quick >= 1.5) out.push({ tone: "ok", title: "Base ativa crescendo", text: `Índice de crescimento ${quick.toFixed(1).replace(".", ",")}: entra mais gente ativa do que sai.` });
  if (m.users >= 10 && pct(m.payers, m.users) < 5) out.push({ tone: "warn", title: "Poucos pagantes", text: `${pctText(m.payers, m.users)} das contas já pagaram. Mostre o PINZ+ onde ele muda a vida da pessoa (mais murais, vídeo, voz, segredo), ofereça cupom de boas-vindas e destaque o presente de 1 mês.` });
  if (g.acquisition.referred + g.acquisition.organic >= 5 && pct(g.acquisition.referred, g.acquisition.referred + g.acquisition.organic) < 10) out.push({ tone: "warn", title: "Pouca indicação", text: "Menos de 10% dos cadastros vêm de indicação. Destaque “Ganhe créditos” depois do primeiro pin e no perfil, e deixe o link de convite a um toque." });
  if (g.acquisition.shares === 0) out.push({ tone: "info", title: "Compartilhamentos não medidos", text: "Nenhum compartilhamento registrado no período (a medição só conta quem aceitou o aviso de cookies)." });
  return out;
}

const TONE: Record<Insight["tone"], string> = { bad: "border-[#e3b3a8] bg-[#fbeae5]", warn: "border-[#ecd9a0] bg-[#fff6dd]", ok: "border-[#bfe0c7] bg-[#eaf7ee]", info: "border-[#d9c9ad] bg-white/70" };
const DOT: Record<Insight["tone"], string> = { bad: "bg-[#c0392b]", warn: "bg-[#d9a21b]", ok: "bg-[#2f8f4e]", info: "bg-[#8a7b69]" };

export function GrowthView({ days }: { days: number }) {
  const [g, setG] = useState<G | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getBrowserSupabase().rpc("admin_growth", { p_days: days });
    if (error) return setErr("Não foi possível carregar o painel de growth.");
    setErr(null);
    setG(data as G);
  }, [days]);
  useEffect(() => {
    setG(null);
    void load();
    const t = window.setInterval(() => document.visibilityState === "visible" && void load(), 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  if (err) return <p role="alert" className="mt-5 text-sm font-semibold text-[#a23b2a]">{err}</p>;
  if (!g) {
    return (
      <div className="grid place-items-center py-16">
        <Spinner />
      </div>
    );
  }

  const { activation: a, acquisition: aq, monetization: mo, engagement: en } = g;
  const done = g.weeks.slice(0, -1); // a última semana está em andamento
  const lastDone = done[done.length - 1];
  const prevDone = done[done.length - 2];
  const recent = done.slice(-4);
  const gained = recent.reduce((n, w) => n + w.new + w.resurrected, 0);
  const lost = recent.reduce((n, w) => n + w.churned, 0);
  const quick = recent.length >= 2 ? (lost > 0 ? gained / lost : gained > 0 ? gained : null) : null;
  const stick = pct(en.dau, en.mau);
  const stickW = pct(en.wau, en.mau);
  const total = aq.organic + aq.referred;
  const ins = insights(g, done, quick);
  const funnel: [string, number, string][] = [
    ["Cadastros no período", a.signups, ""],
    ["Colocaram o 1º pin em até 7 dias", a.pin7, pctText(a.pin7, a.signups)],
    ["Colocaram um botton em até 7 dias", a.badge7, pctText(a.badge7, a.signups)],
    ["Seguiram alguém em até 7 dias", a.follow7, pctText(a.follow7, a.signups)],
    ["Voltaram em outro dia (7 dias)", a.back7, pctText(a.back7, a.signups)],
    ["Ativados (pin ou botton em 7 dias)", a.activated, pctText(a.activated, a.signups)],
  ];

  return (
    <div className="mt-4 space-y-3">
      {/* pulso */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Pulso do crescimento">
        <Kpi title="Criadores ativos (30 dias)" value={nf(en.creators_30)} sub={`${pctText(en.creators_30, en.users)} das ${nf(en.users)} contas · estrela-guia`} />
        <Kpi title="Novos cadastros" value={nf(a.signups)} sub="no período escolhido" cur={a.signups} prev={a.prev_signups} />
        <Kpi title="Ativação em 7 dias" value={pctText(a.activated, a.signups)} sub={`${nf(a.activated)} de ${nf(a.signups)}${a.median_hours_to_first_pin != null ? ` · 1º pin em ${String(a.median_hours_to_first_pin).replace(".", ",")} h (mediana)` : ""}`} />
        <Kpi title="Índice de crescimento" value={quick === null ? "—" : quick.toFixed(1).replace(".", ",")} sub="(novos + recuperados) ÷ perdidos, 4 semanas" />
        <Kpi title="Fidelidade (DAU/MAU)" value={`${stick.toFixed(0)}%`} sub={`DAU ${nf(en.dau)} · WAU ${nf(en.wau)} (${stickW.toFixed(0)}% do MAU) · MAU ${nf(en.mau)}`} />
        <Kpi title="Dias ativos por pessoa" value={en.avg_days_30 == null ? "—" : String(en.avg_days_30).replace(".", ",")} sub="média dos últimos 30 dias, entre os ativos" />
        <Kpi title="Conversão em pagante" value={pctText(mo.payers, mo.users)} sub={`${nf(mo.payers)} pagantes · ${nf(mo.repeat_payers)} recompraram`} />
        <Kpi title="Receita por conta (ARPU)" value={brl(mo.users ? mo.revenue_cents / mo.users : 0)} sub={`${brl(mo.revenue_cents)} no total · ${brl(mo.revenue_period_cents)} no período`} />
      </section>

      {/* o que fazer */}
      <section className={card} aria-label="Leitura do momento">
        <h2 className="font-title text-lg font-semibold">Leitura do momento</h2>
        <ul className="mt-2 grid gap-2 lg:grid-cols-2">
          {ins.map((i) => (
            <li key={i.title} className={`flex gap-2.5 rounded-xl border p-3 text-sm ${TONE[i.tone]}`}>
              <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${DOT[i.tone]}`} />
              <span>
                <b>{i.title}.</b> {i.text}
              </span>
            </li>
          ))}
          {ins.length === 0 && <li className="text-sm text-[#6b5440]">Nada fora do esperado agora.</li>}
        </ul>
      </section>

      {/* contabilidade */}
      <section className={card} aria-label="Contabilidade do crescimento">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-title text-lg font-semibold">Crescimento semana a semana</h2>
          {lastDone && prevDone && (
            <p className="text-sm text-[#6b5440]">
              Ativos na última semana fechada: <b className="tabular-nums">{nf(lastDone.active)}</b> <Delta cur={lastDone.active} prev={prevDone.active} />
            </p>
          )}
        </div>
        <AccountingChart weeks={g.weeks} />
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6b5440]">
          {[
            ["#3aa655", "Novos (cadastraram e usaram)"],
            ["#4f7fd1", "Retidos (já ativos na semana anterior)"],
            ["#d9a21b", "Recuperados (voltaram depois de sumir)"],
            ["#d4574a", "Perdidos (ativos na semana anterior, sumiram)"],
          ].map(([c, t]) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: c }} />
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-[#8a7b69]">A última barra é a semana em andamento (mais clara): os “perdidos” dela ainda podem voltar.</p>
      </section>

      {/* retenção */}
      <section className={card} aria-label="Retenção por coorte">
        <h2 className="font-title text-lg font-semibold">Retenção por turma de cadastro</h2>
        <div className="mt-2">
          <CohortTable cohorts={g.cohorts} />
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2" aria-label="Ativação e aquisição">
        <div className={card}>
          <h3 className="font-title text-base font-semibold">Funil de ativação (quem se cadastrou no período)</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {funnel.map(([t, n, s]) => (
              <li key={t}>
                <div className="flex justify-between gap-3">
                  <span>{t}</span>
                  <span className="font-semibold tabular-nums">
                    {nf(n)}
                    {s ? <span className="font-normal text-[#8a7b69]"> · {s}</span> : null}
                  </span>
                </div>
                <div className="mt-0.5 h-2 rounded-full bg-[#efe4cf]">
                  <div className="h-full rounded-full bg-[#1f232b]" style={{ width: `${Math.max(2, pct(n, Math.max(1, a.signups)))}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className={card}>
          <h3 className="font-title text-base font-semibold">De onde vêm os cadastros</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-[#f6efe0] p-3">
              <p className="font-title text-3xl font-semibold tabular-nums">{pctText(aq.referred, total)}</p>
              <p className="text-xs text-[#6b5440]">por indicação ({nf(aq.referred)})</p>
            </div>
            <div className="rounded-xl bg-[#f6efe0] p-3">
              <p className="font-title text-3xl font-semibold tabular-nums">{pctText(aq.organic, total)}</p>
              <p className="text-xs text-[#6b5440]">orgânico ({nf(aq.organic)})</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-[#6b5440]">
            Compartilhamentos no período: <b className="tabular-nums">{nf(aq.shares)}</b>
            {total > 0 && en.mau > 0 ? <> · cada pessoa ativa trouxe em média <b className="tabular-nums">{(aq.referred / Math.max(1, en.mau)).toFixed(2).replace(".", ",")}</b> cadastro por indicação</> : null}
          </p>
          {aq.top_referrers.length > 0 && (
            <p className="mt-2 text-sm text-[#6b5440]">
              Quem mais indicou: {aq.top_referrers.map((r) => `@${r.name} (${r.value})`).join(" · ")}
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3" aria-label="Canais, idiomas e receita">
        <Bars title="Origem das visitas (sessões)" rows={aq.sources} />
        <Bars title="Idioma dos novos cadastros" rows={aq.locales} />
        <Bars title="Receita por tipo (período)" rows={mo.by_kind} fmt={brl} map={KIND} />
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Monetização">
        <Kpi title="Assinantes PINZ+ agora" value={nf(mo.plus_active)} sub={`${nf(mo.plus_ended_period)} encerraram no período`} />
        <Kpi title="Primeiras compras" value={nf(mo.first_buys_period)} sub="no período" />
        <Kpi title="Tempo até a 1ª compra" value={mo.median_days_to_buy == null ? "—" : `${String(mo.median_days_to_buy).replace(".", ",")} dias`} sub="mediana, do cadastro à compra" />
        <Kpi title="Recompra" value={pctText(mo.repeat_payers, mo.payers)} sub="dos pagantes compraram mais de uma vez" />
      </section>

      <p className="pb-2 text-xs text-[#8a7b69]">
        Como ler: cadastros, pins, bottons, seguidores e pagamentos vêm do banco (histórico completo). “Ativo” usa os eventos de uso medidos (só de quem aceitou o aviso de cookies, além das ações de criar), então retenção e fidelidade são um piso, não o número exato. Atualizado às {new Date(g.generated_at).toLocaleTimeString("pt-BR")}.
      </p>
    </div>
  );
}
