"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";

type Env = "test" | "live";
type Status = { mode: Env; configured: { test: boolean; live: boolean } };

async function call(method: "GET" | "POST", mode?: Env): Promise<Status | "forbidden" | "not_configured" | null> {
  const { data } = await getBrowserSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  try {
    const res = await fetch("/api/admin/pay-mode", { method, headers: { Authorization: `Bearer ${token}`, ...(mode ? { "Content-Type": "application/json" } : {}) }, body: mode ? JSON.stringify({ mode }) : undefined, cache: "no-store" });
    if (res.status === 403) return "forbidden";
    if (res.status === 409) return "not_configured";
    return res.ok ? ((await res.json()) as Status) : null;
  } catch {
    return null;
  }
}

/**
 * Interruptor de ambiente dos pagamentos (Mercado Pago): TESTE (ninguém é cobrado) ou PRODUÇÃO (cobrança real).
 * Fica no topo do /admin, sempre à vista; a troca vale na hora para o site todo. Produção só liga se o servidor tem o token de produção.
 */
export function PayModeSwitch({ onToast }: { onToast: (m: string) => void }) {
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const r = await call("GET");
    if (r && typeof r === "object") {
      setSt(r);
      setFailed(false);
    } else setFailed(true);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function pick(mode: Env) {
    if (!st || busy || st.mode === mode) return;
    if (!st.configured[mode]) return onToast(mode === "live" ? "Falta o token de produção no servidor (MP_ACCESS_TOKEN_LIVE)." : "Falta o token de teste no servidor.");
    const ask = mode === "live" ? "Passar os pagamentos para PRODUÇÃO? A partir de agora as compras são COBRADAS DE VERDADE." : "Voltar os pagamentos para TESTE? Ninguém será cobrado.";
    if (!window.confirm(ask)) return;
    setBusy(true);
    const r = await call("POST", mode);
    setBusy(false);
    if (r && typeof r === "object") {
      setSt(r);
      onToast(r.mode === "live" ? "Pagamentos em PRODUÇÃO: cobrança real." : "Pagamentos em TESTE: ninguém é cobrado.");
    } else if (r === "not_configured") onToast("Esse ambiente não tem token no servidor.");
    else onToast("Não foi possível trocar agora.");
  }

  const live = st?.mode === "live";
  const seg = (mode: Env, label: string) => {
    const on = st?.mode === mode;
    const missing = !!st && !st.configured[mode];
    return (
      <button
        key={mode}
        type="button"
        role="radio"
        aria-checked={on}
        disabled={!st || busy}
        title={missing ? "Sem token configurado no servidor" : undefined}
        onClick={() => void pick(mode)}
        className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-colors disabled:cursor-not-allowed ${on ? (mode === "live" ? "bg-[#b3261e] text-white" : "bg-[#d9a21b] text-[#2a1c12]") : missing ? "cursor-not-allowed text-[#a89b8a]" : "cursor-pointer text-[#4a3826] hover:bg-[#efe4cf]"}`}
      >
        {label}
      </button>
    );
  };

  return (
    <section aria-label="Ambiente dos pagamentos" className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${live ? "border-[#e8b4ae] bg-[#fdecea]" : "border-[#e1d3ba] bg-white/70"}`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          Pagamentos:{" "}
          <span className={live ? "text-[#b3261e]" : "text-[#8a5a00]"}>{st ? (live ? "PRODUÇÃO (cobrança real)" : "TESTE (ninguém é cobrado)") : failed ? "indisponível" : "…"}</span>
        </p>
        <p className="text-xs text-[#6b5440]">
          Mercado Pago. A troca vale na hora para o site todo.
          {st && !st.configured.live ? " Produção ainda sem token no servidor." : ""}
        </p>
      </div>
      <div role="radiogroup" aria-label="Ambiente" className="flex gap-1 rounded-xl border border-[#d9c9ad] bg-white/80 p-1">
        {seg("test", "Teste")}
        {seg("live", "Produção")}
      </div>
    </section>
  );
}
