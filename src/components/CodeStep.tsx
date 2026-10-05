"use client";

import { useEffect, useState, type FormEvent } from "react";
import { confirmEmailCode, sendEmailCode, setFinalizing, type ConfirmFailure } from "@/lib/reserved";
import { getBrowserSupabase } from "@/lib/supabase";
import { Field, ghostButton, inputClass, primaryButton } from "./ui";

const TEXT: Record<ConfirmFailure, string> = {
  wrong_code: "Código incorreto ou vencido. Confira o e-mail ou peça um novo código.",
  no_claim: "Esse e-mail já tem uma conta. Volte e entre com a sua senha.",
  not_allowed: "Esse nome de usuário não pode ser utilizado com esse e-mail.",
  password: "O código está certo, mas não foi possível definir a senha agora. Tente confirmar de novo.",
  error: "Não foi possível confirmar agora. Tente de novo.",
};

/**
 * Passo de confirmação do nome reservado: um código foi enviado ao e-mail; sem confirmar, a pessoa não entra na conta.
 * `onDone` recebe o nome de usuário já definido.
 */
export function CodeStep({ email, nick, password, onDone, onBack }: { email: string; nick: string; password: string; onDone: (nickname: string) => void; onBack: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [wait, setWait] = useState(45); // segundos até poder pedir outro código

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!/^\d{6,10}$/.test(code.trim())) return setError("Digite o código de 6 números que enviamos para o seu e-mail.");
    setBusy(true);
    setError(null);
    const res = await confirmEmailCode(getBrowserSupabase(), email, code, password);
    setBusy(false);
    if (!res.ok) {
      if (res.reason !== "password") setFinalizing(false);
      return setError(TEXT[res.reason]);
    }
    setFinalizing(false);
    onDone(res.nickname);
  }

  async function resend() {
    if (wait > 0) return;
    setError(null);
    setInfo(null);
    const ok = await sendEmailCode(getBrowserSupabase(), email, nick);
    if (ok) {
      setInfo("Enviamos um novo código.");
      setWait(45);
    } else setError("Não foi possível enviar o código agora. Tente de novo em instantes.");
  }

  return (
    <section aria-label="Confirmar e-mail" className="rounded-2xl bg-[#fbf6ea] p-4 text-[15px] text-[#2f2218] shadow-[0_0.8rem_2rem_rgba(0,0,0,.3)]">
      <p className="font-title text-xl font-semibold">Confirme seu e-mail ✉️</p>
      <p role="status" className="mt-2 text-[#4a3826]">
        Um código foi enviado para <strong>{email}</strong>. Confirme para ter acesso à conta: sem a confirmação, você não consegue entrar.
      </p>
      <form onSubmit={submit} noValidate className="mt-4 space-y-3">
        <Field label="Código" error={error}>
          {(id) => <input id={id} value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(null); }} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className={`${inputClass} text-center text-xl tracking-[0.4em]`} />}
        </Field>
        {info && <p className="text-sm text-[#2f6a3c]">{info}</p>}
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "Confirmando…" : "Confirmar e entrar"}
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={resend} disabled={wait > 0} className={`${ghostButton} flex-1 disabled:opacity-60`}>
            {wait > 0 ? `Enviar outro código (${wait}s)` : "Enviar outro código"}
          </button>
          <button type="button" onClick={() => { setFinalizing(false); onBack(); }} className={`${ghostButton} flex-1`}>
            Voltar
          </button>
        </div>
      </form>
    </section>
  );
}
