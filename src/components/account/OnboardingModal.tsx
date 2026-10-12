"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { saveOnboarding, TOUR_EVENT } from "@/lib/onboarding";
import { AvatarUploader } from "../AvatarUploader";
import { Field, inputClass, primaryButton } from "../ui";
import { Modal } from "./Modal";

const ERROR = { too_young: "O Pinz é para maiores de 13 anos.", invalid_birth: "Confira a data de nascimento.", failed: "Não foi possível salvar agora. Tente de novo." } as const;

/**
 * Boas-vindas de quem acabou de criar a conta (por e-mail ou Google): foto de perfil, data de nascimento e convite para o tour.
 * Aparece uma vez por conta (o banco guarda que já passou); fechar ou "Agora não" também conta.
 */
export function OnboardingModal({ open, onClose, nick, plus = false }: { open: boolean; onClose: () => void; nick: string; plus?: boolean }) {
  const [step, setStep] = useState<"profile" | "tour">("profile");
  const [birth, setBirth] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = useRef(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (open) {
      setStep("profile");
      setBirth("");
      setError(null);
    }
  }, [open]);

  function finish(tour: boolean) {
    void saveOnboarding(getBrowserSupabase(), null, true);
    onClose();
    if (tour) window.setTimeout(() => window.dispatchEvent(new CustomEvent(TOUR_EVENT)), 350);
  }

  async function continueProfile() {
    setError(null);
    if (birth) {
      setBusy(true);
      const err = await saveOnboarding(getBrowserSupabase(), birth, false);
      setBusy(false);
      if (err) return setError(ERROR[err]);
    }
    setStep("tour");
  }

  return (
    <Modal open={open} onClose={() => finish(false)} title={step === "profile" ? `Olá, ${nick}!` : "Quer fazer um tour?"}>
      {step === "profile" ? (
        <>
          <p className="text-[15px] leading-snug text-[#4a3826]">Complete o seu perfil para as pessoas reconhecerem você.</p>
          <AvatarUploader nickname={nick} plus={plus} />
          <div className="mt-4">
            <Field label="Data de nascimento">
              {(id) => (
                <input
                  id={id}
                  type="date"
                  value={birth}
                  min="1900-01-01"
                  max={today.current}
                  onChange={(e) => {
                    setBirth(e.target.value);
                    setError(null);
                  }}
                  className={inputClass}
                />
              )}
            </Field>
            <p className="mt-1 text-xs text-[#6b5440]">Só você vê. Não aparece para ninguém.</p>
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
            Agora não
          </button>
        </>
      ) : (
        <>
          <p className="text-[15px] leading-snug text-[#4a3826]">Um passo a passo curtinho, de cerca de 1 minuto, mostrando cada função do Pinz.</p>
          <button type="button" onClick={() => finish(true)} className={`${primaryButton} mt-5`}>
            Fazer o tour
          </button>
          <button type="button" onClick={() => finish(false)} className="mt-2 w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-[#6b5440] hover:bg-black/5">
            Agora não
          </button>
        </>
      )}
    </Modal>
  );
}
