"use client";

import { useState, type FormEvent } from "react";
import type { UnlockResult } from "@/lib/mural";

type Props = {
  question: string;
  unlocked: boolean;
  onSubmit: (answer: string) => Promise<UnlockResult>;
  /** id do campo de resposta (usado para focar a partir de outros botões). */
  inputId: string;
  tone?: "light" | "dark";
};

const LockIcon = () => (
  <svg viewBox="0 0 24 24" className="size-[1.05em]" fill="currentColor" aria-hidden>
    <path d="M7 10V8a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
  </svg>
);

/**
 * Pergunta de desbloqueio. A verificação é feita por quem usa o componente (onSubmit):
 * no mural real, no servidor (Supabase); no demo da página inicial, é simulada.
 */
export function UnlockPanel({ question, unlocked, onSubmit, inputId, tone = "light" }: Props) {
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dark = tone === "dark";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!answer.trim()) {
      setHint("Escreva uma resposta para entrar.");
      return;
    }
    setBusy(true);
    const res = await onSubmit(answer);
    setBusy(false);
    if (res.ok) return;
    if (res.reason === "wrong") setHint("Essa não é a resposta. Tente de novo!");
    else if (res.reason === "rate_limited") {
      const min = Math.max(1, Math.ceil((res.retryAfter ?? 600) / 60));
      setHint(`Muitas tentativas. Tente novamente em ${min} min.`);
    } else setHint("Não foi possível verificar agora. Tente de novo.");
  }

  return (
    <section
      aria-label="Acesso ao mural"
      className={
        dark
          ? "rounded-[1.1em] border border-white/15 bg-[#1c1510]/70 p-[1.2em] text-[#f6efe2] shadow-[0_0.6em_2em_rgba(0,0,0,.45)] backdrop-blur-md"
          : "rounded-[1.1em] border border-[#d9c9ad] bg-[#fbf6ea]/90 p-[1.2em] text-[#2f2218] shadow-[0_0.3em_1em_rgba(80,50,20,.15)]"
      }
    >
      {unlocked ? (
        <div className="rise" role="status">
          <p className="text-[1.15em] leading-tight font-semibold">🔓 Mural desbloqueado</p>
          <p className={`mt-[0.4em] text-[0.9em] leading-snug ${dark ? "text-white/70" : "text-[#6b5440]"}`}>
            Você é de casa! Agora é só deixar o seu recado anônimo.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <p
            className={`inline-flex items-center gap-[0.5em] rounded-full px-[0.8em] py-[0.35em] text-[0.82em] font-medium ${
              dark ? "bg-white/10 text-white/90" : "bg-[#efe4cf] text-[#4a3826]"
            }`}
          >
            <LockIcon /> Só quem me conhece entra
          </p>
          <label htmlFor={inputId} className="mt-[0.9em] block text-[1.25em] leading-snug font-bold">
            {question}
          </label>
          <input
            id={inputId}
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (hint) setHint(null);
            }}
            autoComplete="off"
            placeholder="Digite sua resposta..."
            aria-invalid={hint !== null}
            aria-describedby={hint ? `${inputId}-hint` : undefined}
            className={`mt-[0.8em] w-full rounded-[0.6em] border px-[0.9em] py-[0.7em] text-[1em] outline-none placeholder:text-[#8a7b69] focus-visible:ring-2 focus-visible:ring-[#d98a2b]/70 ${
              dark ? "border-transparent bg-[#e9e5df] text-[#2f2218]" : "border-[#e1d3ba] bg-white/80 text-[#2f2218] focus:bg-white"
            }`}
          />
          {hint && (
            <p id={`${inputId}-hint`} className={`mt-[0.4em] text-[0.85em] ${dark ? "text-[#ffb4a2]" : "text-[#a23b2a]"}`}>
              {hint}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-[0.8em] disabled:opacity-70 flex w-full cursor-pointer items-center justify-center gap-[0.5em] rounded-[0.6em] border border-white/10 bg-[#1f232b] px-[1em] py-[0.8em] text-[1em] font-semibold text-white transition-colors hover:bg-[#2c313b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] active:translate-y-px"
          >
            {busy ? "Verificando…" : "Desbloquear"}
            <svg viewBox="0 0 24 24" className="size-[1.1em]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      )}
    </section>
  );
}
