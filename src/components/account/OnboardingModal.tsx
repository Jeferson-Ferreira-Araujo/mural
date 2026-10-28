"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { OwnMural } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { PROFILE_STEP_DONE_KEY, saveOnboarding } from "@/lib/onboarding";
import { AvatarUploader } from "../AvatarUploader";
import { Field, inputClass, primaryButton } from "../ui";
import { BIRTH_ERROR, BIRTH_FORMAT_HINT, BirthField, toIso } from "./BirthField";
import { Modal } from "./Modal";
import { PinTtlField, type PinTtl } from "./PinTtlField";
import { PrivacyField, privacyError, type Privacy } from "./PrivacyField";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

/**
 * Boas-vindas de quem acabou de criar a conta, numa tela só e obrigatória (sem fechar, só o botão Salvar):
 * à esquerda a foto e a data de nascimento (opcionais; só aparecem se ainda não foram feitas) e à direita a configuração do primeiro mural
 * (nome, público ou privado e validade dos pins de outras pessoas). O banco guarda que já foi feita: nunca mais aparece.
 * O convite e o tour do primeiro pin estão desligados por enquanto.
 */
export function OnboardingModal({ open, onClose, nick, plus = false, uid, profile = true, mural, onSaved }: { open: boolean; onClose: () => void; nick: string; plus?: boolean; uid?: string; /** pede foto e data de nascimento */ profile?: boolean; /** primeiro mural a configurar (null = só o perfil) */ mural?: OwnMural | null; onSaved?: () => void }) {
  const tl = useLit();
  const tx = useTranslations("components.account.OnboardingModal");
  const ts = useTranslations("components.account.MuralSetupModal");
  const [birth, setBirth] = useState("");
  const [title, setTitle] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>({ priv: false, question: "", answer: "" });
  const [ttl, setTtl] = useState<PinTtl>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setBirth("");
    setPrivacy({ priv: false, question: "", answer: "" });
    setTtl(null);
    setError(null);
  }, [open]);
  useEffect(() => {
    if (open && mural) setTitle(mural.title);
  }, [open, mural]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const iso = profile && birth ? toIso(birth) : null;
    if (profile && birth && !iso) return setError(tl(BIRTH_FORMAT_HINT));
    if (mural) {
      if (!title.trim()) return setError(ts("m_deUmNomeAoMural"));
      const perr = privacyError(privacy, false);
      if (perr) return setError(tl(perr));
    }
    setBusy(true);
    setError(null);
    const sb = getBrowserSupabase();
    const err = await saveOnboarding(sb, iso, true);
    if (err) {
      setBusy(false);
      return setError(tl(BIRTH_ERROR[err]));
    }
    if (mural) {
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
      onSaved?.();
    }
    try {
      if (uid) localStorage.removeItem(PROFILE_STEP_DONE_KEY(uid));
    } catch {}
    setBusy(false);
    onClose();
  }

  const both = profile && !!mural;
  return (
    <Modal open={open} onClose={onClose} required wide={both} title={tx("m_ola", { v0: nick })}>
      <form onSubmit={save} noValidate className="space-y-3">
        <div className={`grid gap-x-5 gap-y-3 ${both ? "sm:grid-cols-2" : ""}`}>
          {profile && (
            <div className="space-y-3">
              <AvatarUploader nickname={nick} plus={plus} compact />
              <BirthField value={birth} onChange={(v) => { setBirth(v); setError(null); }} />
            </div>
          )}
          {mural && (
            <div className="space-y-3">
              <Field label={ts("nomeDoMural")}>{(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={ts("exViagemDe2026")} className={inputClass} />}</Field>
              <PrivacyField value={privacy} onChange={setPrivacy} />
              <PinTtlField value={ttl} onChange={setTtl} />
            </div>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-[#a23b2a]">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
          {busy ? tl("Salvando…") : tl("Salvar")}
        </button>
      </form>
    </Modal>
  );
}
