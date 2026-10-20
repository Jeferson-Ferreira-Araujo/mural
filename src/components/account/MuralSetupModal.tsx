"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { OwnMural } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { Field, ghostButton, inputClass, primaryButton } from "../ui";
import { Modal } from "./Modal";
import { PinTtlField, type PinTtl } from "./PinTtlField";
import { PrivacyField, privacyError, type Privacy } from "./PrivacyField";
import { useTranslations } from "next-intl";

/**
 * Primeiro mural da conta nova (que já nasce pronto, com nome padrão): pergunta o nome, se é público ou privado (com a pergunta de segurança)
 * e por quanto tempo ficam os pins de outras pessoas. Tudo dá para mudar depois em Meus murais.
 */
export function MuralSetupModal({ open, onClose, mural, onSaved }: { open: boolean; onClose: () => void; mural: OwnMural | null; onSaved: () => void }) {
  const tx = useTranslations("components.account.MuralSetupModal");
  const [title, setTitle] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>({ priv: false, question: "", answer: "" });
  const [ttl, setTtl] = useState<PinTtl>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !mural) return;
    setTitle(mural.title);
    setPrivacy({ priv: false, question: "", answer: "" });
    setTtl(null);
    setError(null);
  }, [open, mural]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!mural || busy) return;
    if (!title.trim()) return setError(tx("m_deUmNomeAoMural"));
    const perr = privacyError(privacy, false);
    if (perr) return setError(perr);
    setBusy(true);
    setError(null);
    const sb = getBrowserSupabase();
    const steps = [
      sb.rpc("update_mural", { p_id: mural.id, p_title: title.trim() }),
      sb.rpc("set_mural_privacy", { p_mural_id: mural.id, p_private: privacy.priv, p_question: privacy.priv ? privacy.question.trim() : "", p_answer: privacy.priv ? privacy.answer.trim() : null }),
      sb.rpc("set_mural_pin_ttl", { p_mural_id: mural.id, p_days: ttl }),
    ];
    const res = await Promise.all(steps);
    setBusy(false);
    if (res.some((r) => r.error)) return setError(tx("m_naoFoiPossivelSalvarTudo"));
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={tx("configureSeuMural")} label={tx("configureSeuMural")}>
      <form onSubmit={save} noValidate className="space-y-4">
        <p className="text-sm text-[#4a3826]">{tx("seuMuralJaEstaNo")}</p>
        <Field label={tx("nomeDoMural")}>{(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={tx("exViagemDe2026")} className={inputClass} />}</Field>
        <PrivacyField value={privacy} onChange={setPrivacy} />
        <PinTtlField value={ttl} onChange={setTtl} />
        {error && (
          <p role="alert" className="text-sm text-[#a23b2a]">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={`${ghostButton} flex-1`}>
            {tx("depois")}</button>
          <button type="submit" disabled={busy} className={`${primaryButton} flex-1`}>
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
