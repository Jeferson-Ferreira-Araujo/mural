"use client";

import { useEffect, useState } from "react";
import type { OwnMural } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { PROFILE_STEP_DONE_KEY, saveOnboarding } from "@/lib/onboarding";
import { AvatarUploader } from "../AvatarUploader";
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
const PLUS_LIST = [0, 1, 2, 3].map((i) => FEATURES.full[i].text).concat("Mural compartilhado entre duas pessoas");

/**
 * Boas-vindas de quem acabou de criar a conta, passo a passo e obrigatórias (sem fechar):
 * 1) foto e data de nascimento (opcionais; só se ainda não foram feitas); 2) o primeiro mural: nome, público ou privado e validade dos pins de outras pessoas;
 * 3) o que o plano grátis tem e o que o PINZ+ acrescenta. O banco guarda o que já foi feito (a configuração do mural nunca mais aparece).
 */
export function OnboardingModal({ open, onClose, nick, plus = false, uid, profile = true, birthKnown = false, mural, onSaved }: { open: boolean; onClose: () => void; nick: string; plus?: boolean; uid?: string; /** pede foto e data de nascimento */ profile?: boolean; /** a data de nascimento já foi informada no cadastro */ birthKnown?: boolean; /** primeiro mural a configurar (null = não precisa) */ mural?: OwnMural | null; onSaved?: () => void }) {
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
      if (!birthKnown && !iso) return setError(tl(birth ? BIRTH_FORMAT_HINT : "Informe sua data de nascimento (dia/mês/ano)."));
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

  const [more, setMore] = useState(false);
  const stepLabel = `${tl("Etapa")} ${i + 1}/${steps.length}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      required
      title=""
      label={tx("m_ola", { v0: nick })}
      headerLeft={
        <div className="flex min-w-0 items-center gap-1.5">
          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)} aria-label={tl("Voltar")} title={tl("Voltar")} className="-ml-2 grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg transition hover:bg-black/5 active:scale-95">
              <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 5-7 7 7 7" />
              </svg>
            </button>
          )}
          <span className="text-xs font-semibold tracking-wider text-[#6b5440] uppercase">{stepLabel}</span>
        </div>
      }
      aside={
        <div aria-hidden className="flex items-center gap-1.5">
          {steps.map((st, n) => (
            <span key={st} className={`h-1.5 w-7 rounded-full transition-colors ${n === i ? "bg-[#d9a21b]" : "bg-[#e0d1b0]"}`} />
          ))}
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void advance();
        }}
        noValidate
        className="space-y-3"
      >
        {step === "profile" && (
          <div className="space-y-3">
            <div>
              <h3 className="font-title text-xl font-semibold">{tx("m_ola", { v0: nick })}</h3>
            </div>
            <AvatarUploader nickname={nick} plus={plus} compact />
            {!birthKnown && (
              <BirthField
                value={birth}
                onChange={(v) => {
                  setBirth(v);
                  setError(null);
                }}
              />
            )}
          </div>
        )}
        {step === "mural" && (
          <div className="space-y-3">
            <h3 className="font-title text-xl font-semibold">{tl("Seu primeiro mural")}</h3>
            <Field label={ts("nomeDoMural")}>{(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={ts("exViagemDe2026")} className={inputClass} />}</Field>
            <PrivacyField value={privacy} onChange={setPrivacy} />
            <PinTtlField value={ttl} onChange={setTtl} />
          </div>
        )}
        {step === "intro" && (
          <div className="space-y-3">
            <div className="text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#e3f1e1] text-[#2f7d3a]">
                <Tick className="size-7" />
              </span>
              <h3 className="font-title mt-3 text-xl font-semibold">{tl("Seu espaço está quase pronto!")}</h3>
              <p className="mt-1 text-sm leading-snug text-[#6b5440]">{tl("Comece gratuitamente e descubra tudo o que você pode criar no PINZ.")}</p>
            </div>
            <section className="rounded-2xl border-2 border-[#e0b04a] bg-white/80 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 font-semibold">
                  <span className="grid size-5 place-items-center rounded-full border-2 border-[#2f7d3a] text-[#2f7d3a]">
                    <Tick className="size-3" />
                  </span>
                  PINZ Free
                </h4>
                <span className="rounded-full bg-[#d8efd9] px-2.5 py-0.5 text-xs font-semibold text-[#2f7d3a]">{tl("Seu plano atual")}</span>
              </div>
              <p className="mt-2 text-sm text-[#6b5440]">{tl("Seu primeiro mural já está incluído.")}</p>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-[#3a2c1d]">
                {FREE_LIST.map((t) => (
                  <li key={t} className="flex gap-2">
                    <Tick />
                    {tl(t)}
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl border border-[#ecd49a] bg-[#fff6dd] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 font-semibold">
                  <svg viewBox="0 0 24 24" className="size-5 text-[#d9a21b]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7Z" />
                  </svg>
                  {tl("Conheça o PINZ+")}
                </h4>
                <span className="rounded-full bg-[#ece3d0] px-2.5 py-0.5 text-xs font-semibold text-[#6b5440]">{tl("Opcional")}</span>
              </div>
              <p className="mt-2 text-sm text-[#6b5440]">{tl("Mais murais, conteúdos especiais e possibilidades de personalização.")}</p>
              {more && (
                <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-[#3a2c1d]">
                  {PLUS_LIST.map((t) => (
                    <li key={t} className="flex gap-2">
                      <Tick />
                      {tl(t)}
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="mt-2.5 flex w-full cursor-pointer items-center justify-between text-sm font-semibold text-[#8a6410] focus-visible:outline-2 focus-visible:outline-[#d98a2b]">
                {more ? tl("Ocultar benefícios") : tl("Ver todos os benefícios")}
                <svg viewBox="0 0 24 24" className={`size-4 transition-transform ${more ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </button>
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
        {step === "intro" && <p className="text-center text-xs text-[#8a7b69]">{tl("Você pode conhecer o PINZ+ quando quiser.")}</p>}
      </form>
    </Modal>
  );
}

function Tick({ className = "mt-[0.15em] size-3.5 shrink-0 text-[#2f7d3a]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}
