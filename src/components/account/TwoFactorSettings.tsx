"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { useLit } from "@/i18n/literal";

type Step = { kind: "idle" } | { kind: "enroll"; factorId: string; qr: string; secret: string } | { kind: "disable"; factorId: string };

/** "Verificação em duas etapas" no perfil: ativar com um app autenticador (Google Authenticator, Authy…) e desativar com um código. */
export function TwoFactorSettings() {
  const tl = useLit();
  const [on, setOn] = useState<string | null>(null); // id do fator ativo
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await getBrowserSupabase().auth.mfa.listFactors();
    setOn(data?.totp?.find((f) => f.status === "verified")?.id ?? null);
    setLoaded(true);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function start() {
    setBusy(true);
    setMsg(null);
    const sb = getBrowserSupabase();
    // restos de uma tentativa que não terminou
    const { data: f } = await sb.auth.mfa.listFactors();
    for (const x of f?.all ?? []) if (x.factor_type === "totp" && x.status !== "verified") await sb.auth.mfa.unenroll({ factorId: x.id });
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Pinz ${new Date().toISOString().slice(0, 10)}` });
    setBusy(false);
    if (error || !data) return setMsg({ ok: false, text: tl("Não foi possível ativar agora.") });
    setCode("");
    setStep({ kind: "enroll", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm(factorId: string, then: "enable" | "disable") {
    if (code.length < 6 || busy) return;
    setBusy(true);
    setMsg(null);
    const sb = getBrowserSupabase();
    const { data: ch, error: e1 } = await sb.auth.mfa.challenge({ factorId });
    const { error: e2 } = e1 || !ch ? { error: e1 } : await sb.auth.mfa.verify({ factorId, challengeId: ch.id, code });
    if (e1 || e2) {
      setBusy(false);
      setCode("");
      return setMsg({ ok: false, text: tl("Código incorreto. Tente de novo.") });
    }
    if (then === "disable") {
      const { error } = await sb.auth.mfa.unenroll({ factorId });
      setBusy(false);
      if (error) return setMsg({ ok: false, text: tl("Não foi possível ativar agora.") });
      setMsg({ ok: true, text: tl("Verificação em duas etapas desativada.") });
    } else {
      setBusy(false);
      setMsg({ ok: true, text: tl("Verificação em duas etapas ativada.") });
    }
    setStep({ kind: "idle" });
    setCode("");
    void load();
  }

  if (!loaded) return null;
  const input = "w-full rounded-xl border border-[#d9c9ad] bg-white px-4 py-2.5 text-center text-xl font-bold tracking-[0.35em] tabular-nums outline-none focus:ring-2 focus:ring-[#d98a2b]/60";
  const btn = "cursor-pointer rounded-lg border border-[#d9c9ad] bg-white px-3 py-1.5 text-sm font-semibold text-[#4a3826] transition hover:bg-[#efe4cf] disabled:opacity-60";
  return (
    <div className="mt-3 rounded-xl border border-[#e1d3ba] bg-white/70 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{tl("Verificação em duas etapas")}</p>
          <p className="text-xs text-[#6b5440]">{tl("Proteja a sua conta com um código do app autenticador (Google Authenticator, Authy…).")}</p>
        </div>
        {step.kind === "idle" &&
          (on ? (
            <button type="button" disabled={busy} onClick={() => (setCode(""), setMsg(null), setStep({ kind: "disable", factorId: on }))} className={btn}>
              {tl("Desativar")}
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => void start()} className={btn}>
              {tl("Ativar")}
            </button>
          ))}
      </div>

      {step.kind === "enroll" && (
        <div className="mt-3 space-y-2.5">
          <p className="text-sm">{tl("Escaneie o QR code no app autenticador e digite o código de 6 dígitos.")}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={step.qr} alt="QR code" className="mx-auto size-40 rounded-lg border border-[#e1d3ba] bg-white p-1" />
          <p className="text-center text-xs text-[#6b5440]">
            {tl("Ou digite esta chave no app:")} <span className="font-mono font-bold break-all select-all">{step.secret}</span>
          </p>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(e) => e.key === "Enter" && void confirm(step.factorId, "enable")} inputMode="numeric" autoComplete="one-time-code" aria-label={tl("Código de 6 dígitos")} placeholder="000000" className={input} />
          <div className="flex gap-2">
            <button type="button" disabled={busy || code.length < 6} onClick={() => void confirm(step.factorId, "enable")} className="cursor-pointer rounded-lg bg-[#1f232b] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#2c313b] disabled:opacity-60">
              {tl("Confirmar")}
            </button>
            <button type="button" onClick={async () => (await getBrowserSupabase().auth.mfa.unenroll({ factorId: step.factorId }), setStep({ kind: "idle" }))} className={btn}>
              {tl("Cancelar")}
            </button>
          </div>
        </div>
      )}

      {step.kind === "disable" && (
        <div className="mt-3 space-y-2.5">
          <p className="text-sm">{tl("Para desativar, confirme com um código do app.")}</p>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(e) => e.key === "Enter" && void confirm(step.factorId, "disable")} inputMode="numeric" autoComplete="one-time-code" aria-label={tl("Código de 6 dígitos")} placeholder="000000" className={input} />
          <div className="flex gap-2">
            <button type="button" disabled={busy || code.length < 6} onClick={() => void confirm(step.factorId, "disable")} className="cursor-pointer rounded-lg bg-[#a23b2a] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#8c3022] disabled:opacity-60">
              {tl("Desativar")}
            </button>
            <button type="button" onClick={() => setStep({ kind: "idle" })} className={btn}>
              {tl("Cancelar")}
            </button>
          </div>
        </div>
      )}

      {on && step.kind === "idle" && <p className="mt-2 text-xs font-semibold text-[#2f6a3c]">✓ {tl("Ativada")}</p>}
      {msg && (
        <p role="status" className={`mt-2 text-sm font-semibold ${msg.ok ? "text-[#2f6a3c]" : "text-[#a23b2a]"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
