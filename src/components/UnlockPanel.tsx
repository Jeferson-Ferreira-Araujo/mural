"use client";

import { useId, useState, type FormEvent } from "react";
import { Pin } from "./messages/fasteners";

type Props = {
  question: string;
  unlocked: boolean;
  onUnlock: () => void;
};

/**
 * Pergunta de desbloqueio. ETAPA 1: simulação apenas no frontend —
 * qualquer resposta preenchida desbloqueia. A validação real virá com o backend.
 */
export function UnlockPanel({ question, unlocked, onUnlock }: Props) {
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState(false);
  const inputId = useId();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!answer.trim()) {
      setHint(true);
      return;
    }
    setHint(false);
    onUnlock();
  }

  return (
    <section
      aria-label="Acesso ao mural"
      className="paper-grain shadow-paper relative bg-[#f7f0dd] px-[1.6em] pt-[1.5em] pb-[1.3em] text-[#2f2218]"
      style={{ borderRadius: "0.25em" }}
    >
      <Pin color="#2f6fb5" className="top-[0.45em] right-[0.6em]" />

      {unlocked ? (
        <div className="rise" role="status">
          <p className="font-title text-[1.35em] leading-tight font-semibold">🔓 Mural desbloqueado</p>
          <p className="mt-[0.4em] text-[0.95em] leading-snug text-[#6b5440]">
            Você é de casa. Em breve, aqui você poderá deixar o seu recado anônimo.
          </p>
          <button
            type="button"
            disabled
            className="mt-[0.9em] w-full cursor-not-allowed rounded-[0.4em] border border-dashed border-[#6b5440]/50 px-[1em] py-[0.65em] text-[0.95em] font-medium text-[#6b5440]/80"
          >
            + Deixar uma mensagem (em breve)
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <p className="text-[0.95em] font-semibold tracking-wide text-[#2f2218]">🔒 Só quem me conhece entra</p>
          <label htmlFor={inputId} className="font-title mt-[0.6em] block text-[1.2em] leading-snug">
            {question}
          </label>
          <input
            id={inputId}
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (hint) setHint(false);
            }}
            autoComplete="off"
            placeholder="Sua resposta"
            aria-invalid={hint}
            aria-describedby={hint ? `${inputId}-hint` : undefined}
            className="mt-[0.6em] w-full rounded-[0.4em] border border-[#6b5440]/40 bg-white/70 px-[0.8em] py-[0.65em] text-[1em] text-[#2f2218] shadow-[inset_0_0.1em_0.2em_rgba(60,30,0,.12)] outline-none placeholder:text-[#6b5440]/55 focus:border-[#2f2218] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#c9822f]/60"
          />
          {hint && (
            <p id={`${inputId}-hint`} className="mt-[0.4em] text-[0.85em] text-[#a23b2a]">
              Escreva uma resposta para entrar.
            </p>
          )}
          <button
            type="submit"
            className="mt-[0.8em] w-full cursor-pointer rounded-[0.4em] bg-[#3b2616] px-[1em] py-[0.7em] text-[1em] font-semibold text-[#f7f0dd] transition-colors hover:bg-[#51361f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9822f] active:translate-y-px"
          >
            Desbloquear
          </button>
        </form>
      )}
    </section>
  );
}
