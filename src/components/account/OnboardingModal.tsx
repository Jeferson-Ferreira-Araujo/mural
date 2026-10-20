"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { PROFILE_STEP_DONE_KEY, saveOnboarding, TOUR_EVENT } from "@/lib/onboarding";
import { AvatarUploader } from "../AvatarUploader";
import { primaryButton } from "../ui";
import { BIRTH_ERROR, BIRTH_FORMAT_HINT, BirthField, toIso } from "./BirthField";
import { Modal } from "./Modal";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

/**
 * Boas-vindas de quem acabou de criar a conta: foto de perfil, data de nascimento e convite para o tour.
 * Quem entrou por login social já fez foto e data junto com o nome de usuário (uma tela só): para essa pessoa abre direto no convite do tour.
 * Aparece uma vez por conta (o banco guarda que já passou); fechar ou "Agora não" também conta.
 */
export function OnboardingModal({ open, onClose, nick, plus = false, uid }: { open: boolean; onClose: () => void; nick: string; plus?: boolean; uid?: string }) {
  const tl = useLit();
  const tx = useTranslations("components.account.OnboardingModal");
  const [step, setStep] = useState<"profile" | "tour">("profile");
  const [birth, setBirth] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let done = false;
    try {
      done = !!uid && localStorage.getItem(PROFILE_STEP_DONE_KEY(uid)) === "1";
    } catch {}
    setStep(done ? "tour" : "profile");
    setBirth("");
    setError(null);
  }, [open, uid]);

  function finish(tour: boolean) {
    void saveOnboarding(getBrowserSupabase(), null, true);
    try {
      if (uid) localStorage.removeItem(PROFILE_STEP_DONE_KEY(uid));
    } catch {}
    onClose();
    if (tour) window.setTimeout(() => window.dispatchEvent(new CustomEvent(TOUR_EVENT)), 350);
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
    setStep("tour");
  }

  return (
    <Modal open={open} onClose={() => finish(false)} title={step === "profile" ? tx("m_ola", { v0: nick }) : tx("m_vamosColocarOSeuPrimeiro")}>
      {step === "profile" ? (
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
            {busy ? "Salvando…" : "Continuar"}
          </button>
          <button type="button" onClick={() => setStep("tour")} className="mt-2 w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-[#6b5440] hover:bg-black/5">
            {tx("agoraNao")}</button>
        </>
      ) : (
        <>
          <p className="text-[15px] leading-snug text-[#4a3826]">{tx("euVouTeGuiarTocando")}</p>
          <button type="button" onClick={() => finish(true)} className={`${primaryButton} mt-5`}>
            {tx("comecar")}</button>
          <button type="button" onClick={() => finish(false)} className="mt-2 w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-[#6b5440] hover:bg-black/5">
            {tx("agoraNao")}</button>
        </>
      )}
    </Modal>
  );
}
