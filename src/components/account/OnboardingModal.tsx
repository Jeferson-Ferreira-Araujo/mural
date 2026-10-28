"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { PROFILE_STEP_DONE_KEY, saveOnboarding } from "@/lib/onboarding";
import { AvatarUploader } from "../AvatarUploader";
import { primaryButton } from "../ui";
import { BIRTH_ERROR, BIRTH_FORMAT_HINT, BirthField, toIso } from "./BirthField";
import { Modal } from "./Modal";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

/**
 * Boas-vindas de quem acabou de criar a conta: foto de perfil e data de nascimento. (O convite e o tour do primeiro pin estão desligados por enquanto.)
 * Quem entrou por login social já fez foto e data junto com o nome de usuário (uma tela só): para essa pessoa não abre nada.
 * Aparece uma vez por conta (o banco guarda que já passou); fechar ou "Agora não" também conta.
 */
export function OnboardingModal({ open, onClose, nick, plus = false, uid }: { open: boolean; onClose: () => void; nick: string; plus?: boolean; uid?: string }) {
  const tl = useLit();
  const tx = useTranslations("components.account.OnboardingModal");
  const [skip, setSkip] = useState(false);
  const [birth, setBirth] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let done = false;
    try {
      done = !!uid && localStorage.getItem(PROFILE_STEP_DONE_KEY(uid)) === "1";
    } catch {}
    setSkip(done);
    if (done) finish();
    setBirth("");
    setError(null);
  }, [open, uid]);

  function finish() {
    void saveOnboarding(getBrowserSupabase(), null, true);
    try {
      if (uid) localStorage.removeItem(PROFILE_STEP_DONE_KEY(uid));
    } catch {}
    onClose();
  }

  async function continueProfile() {
    setError(null);
    if (birth) {
      const iso = toIso(birth);
      if (!iso) return setError(tl(BIRTH_FORMAT_HINT));
      setBusy(true);
      const err = await saveOnboarding(getBrowserSupabase(), iso, false);
      setBusy(false);
      if (err) return setError(tl(BIRTH_ERROR[err]));
    }
    finish();
  }

  if (skip) return null;
  return (
    <Modal open={open} onClose={() => finish()} title={tx("m_ola", { v0: nick })}>
        <>
          <p className="text-[15px] leading-snug text-[#4a3826]">{tx("completeOSeuPerfilPara")}</p>
          <AvatarUploader nickname={nick} plus={plus} />
          <div className="mt-4">
            <BirthField
              value={birth}
              onChange={(v) => {
                setBirth(v);
                setError(null);
              }}
            />
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-[#a23b2a]">
              {error}
            </p>
          )}
          <button type="button" onClick={() => void continueProfile()} disabled={busy} className={`${primaryButton} mt-4`}>
            {busy ? tl("Salvando…") : tl("Continuar")}
          </button>
          <button type="button" onClick={() => finish()} className="mt-2 w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-[#6b5440] hover:bg-black/5">
            {tx("agoraNao")}</button>
        </>
    </Modal>
  );
}
