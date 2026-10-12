"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { saveOnboarding, TOUR_EVENT } from "@/lib/onboarding";
import { AvatarUploader } from "../AvatarUploader";
import { Field, inputClass, primaryButton } from "../ui";
import { Modal } from "./Modal";

/** DD/MM/AAAA digitado -> AAAA-MM-DD, ou null se a data não existe. */
function toIso(text: string): string | null {
  const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
/** Põe as barras sozinho enquanto a pessoa digita só os números. */
function maskDate(raw: string): string {
  const n = raw.replace(/\D/g, "").slice(0, 8);
  return n.length > 4 ? `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}` : n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n;
}

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
  const picker = useRef<HTMLInputElement>(null);

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
      const iso = toIso(birth);
      if (!iso) return setError("Digite a data assim: dia/mês/ano, por exemplo 25/12/1990.");
      setBusy(true);
      const err = await saveOnboarding(getBrowserSupabase(), iso, false);
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
                <div className="relative">
                  <input
                    id={id}
                    inputMode="numeric"
                    autoComplete="bday"
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                    value={birth}
                    onChange={(e) => {
                      setBirth(maskDate(e.target.value));
                      setError(null);
                    }}
                    className={`${inputClass} pr-12`}
                  />
                  {/* calendário para quem prefere escolher */}
                  <button type="button" aria-label="Escolher a data no calendário" onClick={() => picker.current?.showPicker?.()} className="absolute inset-y-0 right-1 grid w-11 cursor-pointer place-items-center text-[#6b5440] hover:text-[#2f2218]">
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3.500" y="5" width="17" height="15" rx="2" />
                      <path d="M3.500 10h17M8 3v4M16 3v4" />
                    </svg>
                  </button>
                  <input
                    ref={picker}
                    type="date"
                    tabIndex={-1}
                    aria-hidden
                    min="1900-01-01"
                    max={today.current}
                    onChange={(e) => {
                      const [y, mo, d] = e.target.value.split("-");
                      if (y) setBirth(`${d}/${mo}/${y}`);
                      setError(null);
                    }}
                    className="pointer-events-none absolute right-0 bottom-0 size-px opacity-0"
                  />
                </div>
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
