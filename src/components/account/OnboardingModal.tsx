"use client";

import { useEffect, useState } from "react";
import type { OwnMural } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { PROFILE_STEP_DONE_KEY, saveOnboarding } from "@/lib/onboarding";
import { AvatarUploader } from "../AvatarUploader";
import { PlanBadge } from "../board/PlanBadge";
import { Field, inputClass, primaryButton } from "../ui";
import { BIRTH_ERROR, BIRTH_FORMAT_HINT, BirthField, toIso } from "./BirthField";
import { Modal } from "./Modal";
import { FEATURES } from "./PlansModal";
import { PinTtlField, type PinTtl } from "./PinTtlField";
import { PrivacyField, privacyError, type Privacy } from "./PrivacyField";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

type Step = "profile" | "mural" | "intro";

const FREE_LIST = [0, 1, 2, 3, 6].map((i) => FEATURES.free[i].text);
const PLUS_LIST = [0, 2, 3, 4].map((i) => FEATURES.full[i].text).concat("Displays em segredo para os visitantes");

/**
 * Boas-vindas de quem acabou de criar a conta, passo a passo e obrigatórias (sem fechar):
 * 1) foto e data de nascimento (opcionais; só se ainda não foram feitas); 2) o primeiro mural: nome, público ou privado e validade dos pins de outras pessoas;
 * 3) o que o plano grátis tem e o que o PINZ+ acrescenta. O banco guarda o que já foi feito (a configuração do mural nunca mais aparece).
 */
export function OnboardingModal({ open, onClose, nick, plus = false, uid, profile = true, mural, onSaved }: { open: boolean; onClose: () => void; nick: string; plus?: boolean; uid?: string; /** pede foto e data de nascimento */ profile?: boolean; /** primeiro mural a configurar (null = não precisa) */ mural?: OwnMural | null; onSaved?: () => void }) {
  const tl = useLit();
  const tx = useTranslations("components.account.OnboardingModal");
  const ts = useTranslations("components.account.MuralSetupModal");
  const steps: Step[] = [...(profile ? (["profile"] as const) : []), ...(mural ? (["mural"] as const) : []), "intro"];
  const [i, setI] = useState(0);
  const [birth, setBirth] = useState("");
  const [title, setTitle] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>({ priv: false, question: "", answer: "" });
  const [ttl, setTtl] = useState<PinTtl>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setI(0);
    setBirth("");
    setPrivacy({ priv: false, question: "", answer: "" });
    setTtl(null);
    setError(null);
  }, [open]);
  useEffect(() => {
    if (open && mural) setTitle(mural.title);
  }, [open, mural]);

  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;
  const next = () => {
    setError(null);
    setI((n) => n + 1);
  };

  async function advance() {
    if (busy) return;
    setError(null);
    const sb = getBrowserSupabase();
    if (step === "profile") {
      const iso = birth ? toIso(birth) : null;
      if (birth && !iso) return setError(tl(BIRTH_FORMAT_HINT));
      if (iso) {
        setBusy(true);
        const err = await saveOnboarding(sb, iso, false);
        setBusy(false);
        if (err) return setError(tl(BIRTH_ERROR[err]));
      }
      return next();
    }
    if (step === "mural" && mural) {
      if (!title.trim()) return setError(ts("m_deUmNomeAoMural"));
      const perr = privacyError(privacy, false);
      if (perr) return setError(tl(perr));
      setBusy(true);
      const res = await Promise.all([
        sb.rpc("update_mural", { p_id: mural.id, p_title: title.trim() }),
        sb.rpc("set_mural_privacy", { p_mural_id: mural.id, p_private: privacy.priv, p_question: privacy.priv ? privacy.question.trim() : "", p_answer: privacy.priv ? privacy.answer.trim() : null }),
        sb.rpc("set_mural_pin_ttl", { p_mural_id: mural.id, p_days: ttl }),
      ]);
      if (res.some((r) => r.error)) {
        setBusy(false);
        return setError(ts("m_naoFoiPossivelSalvarTudo"));
      }
      await sb.rpc("finish_mural_setup"); // o banco guarda que já foi feita: nunca mais aparece, em nenhum aparelho
      setBusy(false);
      onSaved?.();
      return next();
    }
    // último passo: conclui as boas-vindas
    setBusy(true);
    await saveOnboarding(sb, null, true);
    setBusy(false);
    try {
      if (uid) localStorage.removeItem(PROFILE_STEP_DONE_KEY(uid));
    } catch {}
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} required onBack={i > 0 ? () => setI(i - 1) : undefined} title={tx("m_ola", { v0: nick })}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void advance();
        }}
        noValidate
        className="space-y-3"
      >
        {steps.length > 1 && (
          <div aria-hidden className="flex justify-center gap-1.5">
            {steps.map((s, n) => (
              <span key={s} className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-[#d9a21b]" : "w-1.5 bg-[#d9c9ad]"}`} />
            ))}
          </div>
        )}
        {step === "profile" && (
          <div className="space-y-3">
            <p className="text-sm leading-snug text-[#4a3826]">{tx("completeOSeuPerfilPara")}</p>
            <AvatarUploader nickname={nick} plus={plus} compact />
            <BirthField
              value={birth}
              onChange={(v) => {
                setBirth(v);
                setError(null);
              }}
            />
          </div>
        )}
        {step === "mural" && (
          <div className="space-y-3">
            <Field label={ts("nomeDoMural")}>{(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={ts("exViagemDe2026")} className={inputClass} />}</Field>
            <PrivacyField value={privacy} onChange={setPrivacy} />
            <PinTtlField value={ttl} onChange={setTtl} />
          </div>
        )}
        {step === "intro" && (
          <div className="grid gap-2.5 sm:grid-cols-2">
            <section className="rounded-xl border border-[#d9c9ad] bg-white/70 p-3">
              <PlanBadge plan="free" />
              <ul className="mt-2 space-y-1 text-[13px] leading-snug text-[#3a2c1d]">
                {FREE_LIST.map((t) => (
                  <li key={t} className="flex gap-1.5">
                    <Tick />
                    {tl(t)}
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-xl border-2 border-[#e0b04a] bg-[#fff8e4] p-3">
              <PlanBadge plan="full" />
              <ul className="mt-2 space-y-1 text-[13px] leading-snug text-[#3a2c1d]">
                {PLUS_LIST.map((t) => (
                  <li key={t} className="flex gap-1.5">
                    <Tick />
                    {tl(t)}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-[#a23b2a]">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? tl("Salvando…") : last ? tx("comecar") : tl("Continuar")}
        </button>
      </form>
    </Modal>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 24 24" className="mt-[0.15em] size-3.5 shrink-0 text-[#d9a21b]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}
