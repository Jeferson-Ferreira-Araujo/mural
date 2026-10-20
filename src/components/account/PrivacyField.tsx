"use client";

import { Field, inputClass } from "../ui";
import { useTranslations } from "next-intl";

export type Privacy = { priv: boolean; question: string; answer: string };

/** Valida o que a pessoa preencheu (null = tudo certo). */
export function privacyError(p: Privacy, hadAnswer: boolean): string | null {
  if (!p.priv) return null;
  const q = p.question.trim();
  if (q.length < 3) return q === "" ? "Escreva a pergunta de segurança." : "A pergunta precisa ter pelo menos 3 letras.";
  if (!p.answer.trim() && !hadAnswer) return "Digite a resposta.";
  return null;
}

/** Pergunta de segurança DESTE mural: público (qualquer pessoa abre) ou privado (só abre quem acerta a resposta). */
export function PrivacyField({ value, onChange }: { value: Privacy; onChange: (v: Privacy) => void }) {
  const tx = useTranslations("components.account.PrivacyField");
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-1 text-sm font-semibold">{tx("quemPodeAbrirEsteMural")}</legend>
      <div role="radiogroup" aria-label={tx("quemPodeAbrirEsteMural")} className="grid grid-cols-2 gap-2">
        {(
          [
            [false, "🌐 Público"],
            [true, "🔒 Privado"],
          ] as const
        ).map(([val, label]) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={value.priv === val}
            onClick={() => onChange({ ...value, priv: val })}
            className={`cursor-pointer rounded-xl border-2 px-3 py-2 text-sm font-bold transition ${value.priv === val ? "border-[#d9a21b] bg-[#fff6dd] shadow-[0_0.2rem_0.7rem_rgba(217,162,27,.3)]" : "border-[#e1d3ba] bg-white hover:bg-[#fff6dd]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {value.priv && (
        <>
          <Field label={tx("perguntaDeSeguranca")}>{(id) => <input id={id} value={value.question} onChange={(e) => onChange({ ...value, question: e.target.value })} maxLength={140} placeholder={tx("exQualONomeDo")} className={inputClass} />}</Field>
          <Field label={tx("resposta")}>{(id) => <input id={id} value={value.answer} onChange={(e) => onChange({ ...value, answer: e.target.value })} maxLength={100} autoComplete="off" placeholder={tx("digiteAResposta")} className={inputClass} />}</Field>
        </>
      )}
    </fieldset>
  );
}
