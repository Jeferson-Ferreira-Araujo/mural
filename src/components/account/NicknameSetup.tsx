"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { primaryButton, NicknameField, useNicknameStatus } from "../ui";

const ERROR: Record<string, string> = {
  nickname_taken: "Esse nome de usuário já está em uso.",
  invalid_nickname: "Esse nome não pode ser utilizado. Use de 3 a 30 letras minúsculas, números ou underline (_).",
  reserved: "Esse nome de usuário não pode ser utilizado.",
};

/**
 * Quem entrou por login social (Google etc.) ainda não escolheu o nome de usuário: aparece esta janela, que não fecha até a pessoa escolher.
 * `suggested` é o nome automático criado a partir do e-mail.
 */
export function NicknameSetup({ open, suggested, onDone }: { open: boolean; suggested: string; onDone: (nickname: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [nick, setNick] = useState(suggested);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const state = useNicknameStatus(nick);
  // o nome sugerido já é da própria conta: vale mesmo sendo "ocupado" por ela
  const ok = nick === suggested || state === "ok";

  useEffect(() => setNick(suggested), [suggested]);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !ok) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await getBrowserSupabase().rpc("claim_nickname", { p_nick: nick });
    setBusy(false);
    if (err || typeof data !== "string") {
      const key = Object.keys(ERROR).find((k) => err?.message.includes(k));
      return setError(key ? ERROR[key] : "Não foi possível salvar agora. Tente de novo.");
    }
    onDone(data);
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => e.preventDefault()} // Esc não fecha: a escolha é obrigatória
      aria-label="Escolha seu nome de usuário"
      className="m-auto w-[min(94vw,28rem)] rounded-3xl border border-[#e6d8bd] bg-[#fbf6ea] p-0 text-[#2f2218] shadow-[0_2rem_5rem_rgba(0,0,0,.55)] backdrop:bg-black/70"
    >
      {open && (
        <form onSubmit={submit} noValidate className="space-y-4 p-6">
          <h2 className="font-title text-xl font-semibold">Escolha seu nome de usuário</h2>
          <p className="text-[15px] text-[#4a3826]">É assim que as pessoas vão te encontrar e abrir o seu mural. Depois de salvo, não dá para mudar.</p>
          <NicknameField value={nick} onChange={(v) => { setNick(v); setError(null); }} state={nick === suggested ? "ok" : state} autoFocus />
          {error && (
            <p role="alert" className="text-sm text-[#a23b2a]">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy || !ok} className={primaryButton}>
            {busy ? "Salvando…" : "Continuar"}
          </button>
        </form>
      )}
    </dialog>
  );
}
