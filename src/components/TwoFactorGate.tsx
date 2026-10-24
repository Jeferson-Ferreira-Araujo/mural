"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/auth";
import { useLit } from "@/i18n/literal";

/**
 * Verificação em duas etapas (app autenticador): quem ativou precisa digitar o código de 6 dígitos ao entrar.
 * Enquanto a sessão não passa pelo código, a tela fica coberta por este aviso e as compras e downloads de dados são recusados no servidor.
 */
export function TwoFactorGate() {
  const tl = useLit();
  const { session } = useSession();
  const [need, setNeed] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const check = useCallback(async () => {
    const sb = getBrowserSupabase();
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: f } = await sb.auth.mfa.listFactors();
      const totp = f?.totp?.find((x) => x.status === "verified");
      setFactorId(totp?.id ?? null);
      setNeed(!!totp);
    } else setNeed(false);
  }, []);

  useEffect(() => {
    if (!session) return setNeed(false);
    void check();
  }, [session, check]);

  if (!session || !need || !factorId) return null;

  async function verify() {
    if (!factorId || code.trim().length < 6 || busy) return;
    setBusy(true);
    setErr(null);
    const sb = getBrowserSupabase();
    const { data: ch, error: e1 } = await sb.auth.mfa.challenge({ factorId });
    const { error: e2 } = e1 || !ch ? { error: e1 } : await sb.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.trim() });
    setBusy(false);
    if (e1 || e2) {
      setErr(tl("Código incorreto. Tente de novo."));
      setCode("");
      return;
    }
    setNeed(false);
    window.location.reload(); // recarrega já com a sessão confirmada
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={tl("Verificação em duas etapas")} className="fixed inset-0 z-[900] grid place-items-center bg-[#1b110a]/90 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-[#e1d3ba] bg-[#fffaf0] p-6 text-[#2a1c12] shadow-2xl">
        <h2 className="font-title text-xl font-semibold">{tl("Verificação em duas etapas")}</h2>
        <p className="mt-1 text-sm text-[#6b5440]">{tl("Digite o código do seu app autenticador para entrar.")}</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && void verify()}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          aria-label={tl("Código de 6 dígitos")}
          placeholder="000000"
          className="mt-4 w-full rounded-xl border border-[#d9c9ad] bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] tabular-nums outline-none focus:ring-2 focus:ring-[#d98a2b]/60"
        />
        {err && (
          <p role="alert" className="mt-2 text-sm font-semibold text-[#a23b2a]">
            {err}
          </p>
        )}
        <button type="button" disabled={busy || code.length < 6} onClick={() => void verify()} className="mt-4 w-full cursor-pointer rounded-xl bg-[#1f232b] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2c313b] disabled:opacity-60">
          {tl("Entrar")}
        </button>
        <button
          type="button"
          onClick={async () => {
            await getBrowserSupabase().auth.signOut();
            window.location.href = "/";
          }}
          className="mt-3 w-full cursor-pointer text-sm font-semibold text-[#6b5440] underline"
        >
          {tl("Sair da conta")}
        </button>
      </div>
    </div>
  );
}
