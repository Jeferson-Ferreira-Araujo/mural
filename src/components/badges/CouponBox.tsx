"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { useLit } from "@/i18n/literal";

export const INVENTORY_EVENT = "pinz:reload-inventory";

/** "Tem um cupom?": digita o código e resgata créditos ou dias de PINZ+. */
export function CouponBox() {
  const tl = useLit();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function redeem() {
    if (!code.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    const { data, error } = await getBrowserSupabase().rpc("redeem_coupon", { p_code: code });
    setBusy(false);
    const r = data as { ok?: boolean; reason?: string; kind?: string; amount?: number } | null;
    if (error || !r) return setMsg({ ok: false, text: tl("Não foi possível resgatar agora. Tente de novo.") });
    if (r.ok) {
      setCode("");
      window.dispatchEvent(new CustomEvent(INVENTORY_EVENT));
      return setMsg({ ok: true, text: r.kind === "credits" ? `${tl("Cupom resgatado:")} +${r.amount} ${tl("créditos")}` : `${tl("Cupom resgatado:")} ${r.amount} ${tl("dias de PINZ+")}` });
    }
    const why: Record<string, string> = {
      invalid: tl("Código inválido."),
      expired: tl("Esse cupom expirou."),
      already: tl("Você já usou esse cupom."),
      exhausted: tl("Esse cupom esgotou."),
      too_many: tl("Muitas tentativas. Tente de novo em 15 minutos."),
    };
    setMsg({ ok: false, text: why[r.reason ?? ""] ?? tl("Código inválido.") });
  }

  return (
    <div className="border-t border-[#ecd9a0]/70 px-4 py-3 sm:px-5">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="cursor-pointer text-sm font-semibold text-[#4a3826] underline">
          {tl("Tem um cupom?")}
        </button>
      ) : (
        <div>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && void redeem()} maxLength={30} autoComplete="off" autoCapitalize="characters" aria-label={tl("Código do cupom")} placeholder={tl("Código do cupom")} className="min-w-0 flex-1 rounded-xl border border-[#d9c9ad] bg-white px-3 py-2 text-sm font-semibold tracking-wide outline-none focus:ring-2 focus:ring-[#d98a2b]/60" />
            <button type="button" disabled={busy || !code.trim()} onClick={() => void redeem()} className="cursor-pointer rounded-xl bg-[#1f232b] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#2c313b] disabled:opacity-60">
              {busy ? tl("Resgatando…") : tl("Resgatar")}
            </button>
          </div>
          {msg && (
            <p role="status" className={`mt-2 text-sm font-semibold ${msg.ok ? "text-[#2f6a3c]" : "text-[#a23b2a]"}`}>
              {msg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
