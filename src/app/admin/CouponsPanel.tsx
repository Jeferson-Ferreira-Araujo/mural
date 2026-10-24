"use client";

import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui";
import { getBrowserSupabase } from "@/lib/supabase";

type Coupon = { code: string; kind: "credits" | "plus_days"; amount: number; maxUses: number | null; used: number; expiresAt: string | null; active: boolean; note: string | null; createdAt: string };

const card = "rounded-2xl border border-[#e1d3ba] bg-white/70 p-4";
const input = "w-full rounded-lg border border-[#d9c9ad] bg-white px-3 py-2 text-sm text-[#2f2218] outline-none focus:ring-2 focus:ring-[#d98a2b]/60";
const btn = "cursor-pointer rounded-lg border border-[#d9c9ad] bg-white/70 px-3 py-1.5 text-sm font-semibold text-[#4a3826] transition hover:bg-[#efe4cf] disabled:cursor-not-allowed disabled:opacity-60";
const primary = "cursor-pointer rounded-lg bg-[#1f232b] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2c313b] disabled:cursor-not-allowed disabled:opacity-60";

/** Cupons e códigos promocionais: créditos ou dias de PINZ+, com limite de usos e validade. Cada código vale uma vez por conta. */
export function CouponsPanel({ onToast }: { onToast: (t: string) => void }) {
  const [rows, setRows] = useState<Coupon[] | null>(null);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"credits" | "plus_days">("credits");
  const [amount, setAmount] = useState("10");
  const [max, setMax] = useState("");
  const [expires, setExpires] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getBrowserSupabase().rpc("admin_list_coupons");
    setRows(Array.isArray(data) ? (data as Coupon[]) : []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(c)) return onToast("O código usa letras, números, - e _ (3 a 30 caracteres).");
    const n = Math.round(Number(amount));
    if (!(n >= 1)) return onToast("Informe a quantidade.");
    setBusy(true);
    const { error } = await getBrowserSupabase().rpc("admin_save_coupon", {
      p_code: c,
      p_kind: kind,
      p_amount: n,
      p_max_uses: max.trim() ? Math.round(Number(max)) : null,
      p_expires: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
      p_note: note.trim() || null,
    });
    setBusy(false);
    if (error) return onToast(error.message.includes("duplicate") ? "Esse código já existe." : "Não foi possível criar o cupom.");
    setCode("");
    setNote("");
    onToast(`Cupom ${c} criado.`);
    void load();
  }
  async function toggle(c: Coupon) {
    await getBrowserSupabase().rpc("admin_set_coupon_active", { p_code: c.code, p_active: !c.active });
    void load();
  }
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "sem prazo");

  return (
    <section className="mt-4 space-y-4" aria-label="Cupons">
      <div className={card}>
        <h2 className="font-title text-lg font-semibold">Novo cupom</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-semibold">
            Código
            <input className={`${input} mt-1 uppercase`} value={code} onChange={(e) => setCode(e.target.value)} maxLength={30} placeholder="BEMVINDO" />
          </label>
          <label className="text-sm font-semibold">
            Vale
            <select className={`${input} mt-1`} value={kind} onChange={(e) => setKind(e.target.value as "credits" | "plus_days")}>
              <option value="credits">Créditos</option>
              <option value="plus_days">Dias de PINZ+</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Quantidade
            <input className={`${input} mt-1`} type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="text-sm font-semibold">
            Limite de usos (vazio = ilimitado)
            <input className={`${input} mt-1`} type="number" min={1} value={max} onChange={(e) => setMax(e.target.value)} />
          </label>
          <label className="text-sm font-semibold">
            Vale até (vazio = sem prazo)
            <input className={`${input} mt-1`} type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </label>
          <label className="text-sm font-semibold">
            Anotação (só para você)
            <input className={`${input} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="Campanha de lançamento" />
          </label>
        </div>
        <button type="button" disabled={busy} onClick={() => void create()} className={`${primary} mt-3`}>
          Criar cupom
        </button>
      </div>

      <div className={card}>
        <h2 className="font-title text-lg font-semibold">Cupons</h2>
        {!rows ? (
          <div className="py-6">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-2 text-sm text-[#6b5440]">Nenhum cupom ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#efe4cf]">
            {rows.map((c) => (
              <li key={c.code} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-mono font-bold">{c.code}</p>
                  <p className="text-[#6b5440]">
                    {c.kind === "credits" ? `${c.amount} créditos` : `${c.amount} dias de PINZ+`} · {c.used}
                    {c.maxUses ? ` de ${c.maxUses}` : ""} usos · válido até {fmt(c.expiresAt)}
                    {c.note ? ` · ${c.note}` : ""}
                  </p>
                </div>
                <button type="button" onClick={() => void toggle(c)} className={btn}>
                  {c.active ? "Desativar" : "Ativar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
