"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { checkSignup } from "@/lib/reserved";
import { getBrowserSupabase } from "@/lib/supabase";
import { saveOnboarding, PROFILE_STEP_DONE_KEY } from "@/lib/onboarding";
import { primaryButton, NicknameField, useNicknameStatus } from "../ui";
import { AvatarUploader } from "../AvatarUploader";
import { BIRTH_ERROR, BIRTH_FORMAT_HINT, BirthField, isUnder13, toIso } from "./BirthField";
import { useTranslations } from "next-intl";

const ERROR: Record<string, string> = {
  nickname_taken: "Esse nome de usuário já está em uso.",
  invalid_nickname: "Esse nome não pode ser utilizado. Use de 3 a 30 letras minúsculas, números ou underline (_).",
  reserved: "Esse nome de usuário não pode ser utilizado.",
};

/**
 * Quem entrou por login social (Google etc.) ainda não escolheu o nome de usuário: aparece esta janela, que não fecha até a pessoa escolher.
 * Numa tela só: nome de usuário (obrigatório), foto de perfil e data de nascimento (opcionais).
 * `suggested` é o nome automático criado a partir do e-mail.
 */
export function NicknameSetup({ open, suggested, onDone }: { open: boolean; suggested: string; onDone: (nickname: string) => void }) {
  const tx = useTranslations("components.account.NicknameSetup");
  const ref = useRef<HTMLDialogElement>(null);
  const [nick, setNick] = useState(suggested);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [birth, setBirth] = useState("");
  const free = useNicknameStatus(nick);
  const [reserved, setReserved] = useState<"checking" | "ok" | "denied">("ok");
  // nome de empresa: só passa quem entrou com e-mail do domínio da marca (o servidor confere de novo ao salvar)
  useEffect(() => {
    if (free !== "ok" || nick === suggested) return setReserved("ok");
    setReserved("checking");
    let cancelled = false;
    void (async () => {
      const sb = getBrowserSupabase();
      const email = (await sb.auth.getUser()).data.user?.email ?? "";
      const r = await checkSignup(sb, nick, email);
      if (!cancelled) setReserved(r === "denied" ? "denied" : "ok");
    })();
    return () => {
      cancelled = true;
    };
  }, [free, nick, suggested]);
  const state = free === "ok" ? (reserved === "denied" ? "denied" : reserved === "checking" ? "checking" : "ok") : free;
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
    setError(null);
    const iso = birth ? toIso(birth) : null;
    if (birth && !iso) return setError(BIRTH_FORMAT_HINT);
    if (iso && isUnder13(iso)) return setError(BIRTH_ERROR.too_young); // confere antes de salvar o nome (que depois não muda)
    setBusy(true);
    const { data, error: err } = await getBrowserSupabase().rpc("claim_nickname", { p_nick: nick });
    setBusy(false);
    if (err || typeof data !== "string") {
      const key = Object.keys(ERROR).find((k) => err?.message.includes(k));
      return setError(key ? ERROR[key] : "Não foi possível salvar agora. Tente de novo.");
    }
    const sb = getBrowserSupabase();
    if (iso) await saveOnboarding(sb, iso, false); // a data é opcional: se falhar, o nome já salvo segue valendo
    try {
      const uid = (await sb.auth.getUser()).data.user?.id;
      if (uid) localStorage.setItem(PROFILE_STEP_DONE_KEY(uid), "1");
    } catch {}
    onDone(data);
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => e.preventDefault()} // Esc não fecha: a escolha é obrigatória
      aria-label={tx("completeOSeuPerfil")}
      className="m-auto max-h-[94dvh] w-[min(94vw,28rem)] overflow-y-auto rounded-3xl border border-[#e6d8bd] bg-[#fbf6ea] p-0 text-[#2f2218] shadow-[0_2rem_5rem_rgba(0,0,0,.55)] backdrop:bg-black/70"
    >
      {open && (
        <form onSubmit={submit} noValidate className="space-y-4 p-6">
          <h2 className="font-title text-xl font-semibold">{tx("completeOSeuPerfil")}</h2>
          <p className="text-[15px] text-[#4a3826]">{tx("escolhaOSeuNomeDe")}</p>
          <NicknameField value={nick} onChange={(v) => { setNick(v); setError(null); }} state={nick === suggested ? "ok" : state} autoFocus />
          <AvatarUploader nickname={nick || suggested} />
          <BirthField value={birth} onChange={(v) => { setBirth(v); setError(null); }} />
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
