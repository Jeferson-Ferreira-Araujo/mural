"use client";

export type Item = { name: string; value: number };

export const nf = (n: number) => Math.round(n).toLocaleString("pt-BR");
export const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const label = (map: Record<string, string>, k: string) => map[k] ?? k;

/** cartão do painel: claro, sem borda, sombra suave */
export const panel = "rounded-2xl bg-[#fffaf1] shadow-[0_2px_10px_rgba(90,60,20,.07)]";
export const card = `${panel} p-4`;
export const chip = (on: boolean) => `cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition ${on ? "bg-[#1f232b] text-white" : "border border-[#d9c9ad] bg-white/70 text-[#4a3826] hover:bg-[#efe4cf]"}`;

export function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev && !cur) return null;
  if (!prev) return <span className="text-xs font-bold text-[#2f8f4e]">novo</span>;
  const p = ((cur - prev) / prev) * 100;
  const up = p >= 0;
  return (
    <span className={`text-xs font-bold ${up ? "text-[#2f8f4e]" : "text-[#c0392b]"}`} title={`Período anterior: ${nf(prev)}`}>
      {up ? "▲" : "▼"} {Math.abs(p) < 10 ? Math.abs(p).toFixed(1) : nf(Math.abs(p))}%
    </span>
  );
}

export function Kpi({ title, value, sub, cur, prev }: { title: string; value: string; sub?: string; cur?: number; prev?: number }) {
  return (
    <div className={card}>
      <p className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">{title}</p>
      <p className="font-title mt-1 text-[2rem] leading-tight font-semibold tabular-nums">{value}</p>
      <div className="mt-0.5 flex items-center gap-2">
        {cur !== undefined && prev !== undefined && <Delta cur={cur} prev={prev} />}
        {sub && <span className="text-xs text-[#6b5440]">{sub}</span>}
      </div>
    </div>
  );
}

export function Bars({ title, rows, fmt = nf, map }: { title: string; rows: Item[]; fmt?: (n: number) => string; map?: Record<string, string> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className={card}>
      <h3 className="font-title text-base font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-[#8a7b69]">Sem dados ainda neste período.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.name} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="truncate">{map ? label(map, r.name) : r.name}</span>
                <span className="font-semibold tabular-nums">{fmt(r.value)}</span>
              </div>
              <div className="mt-0.5 h-1.5 rounded-full bg-[#efe4cf]">
                <div className="h-full rounded-full bg-[#d9a21b]" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

