"use client";

import { useState, type FormEvent } from "react";
import type { UnlockResult } from "@/lib/mural";
import { Avatar } from "./Avatar";

type Props = {
  question: string;
  unlocked: boolean;
  onSubmit: (answer: string) => Promise<UnlockResult>;
  /** id do campo de resposta (usado para focar a partir de outros botões). */
  inputId: string;
  tone?: "light" | "dark";
  /** cabeçalho do cartão: o mural escolhido e de quem é */
  title?: string;
  owner?: string;
  /** foto do dono */
  avatar?: string | null;
  /** mural público (sem pergunta): só o cabeçalho */
  open?: boolean;
  /** dono com PINZ PLUS: borda dourada na foto e selo PLUS no cabeçalho */
  plus?: boolean;
  /** quantos acessos o perfil teve (não aparece sem o número) */
  visits?: number;
  /** mural compartilhado: pede a senha (campo escondido) em vez de uma pergunta */
  password?: boolean;
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
export function UnlockPanel({ question, unlocked, onSubmit, inputId, tone = "light", title, owner, avatar, open = false, password = false, plus = false, visits }: Props) {
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dark = tone === "dark";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!answer.trim()) {
      setHint(password ? "Digite a senha para entrar." : "Escreva uma resposta para entrar.");
      return;
    }
    setBusy(true);
    const res = await onSubmit(answer);
    setBusy(false);
    if (res.ok) return;
    if (res.reason === "wrong") setHint(password ? "Senha incorreta." : "Essa não é a resposta. Tente de novo!");
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
      {title && (
        <header className={`flex items-start justify-between gap-[0.8em] ${open ? "" : `mb-[0.9em] border-b pb-[0.8em] ${dark ? "border-white/10" : "border-[#e6d8bd]"}`}`}>
          <div className="flex min-w-0 items-center gap-[0.7em]">
            {owner && <Avatar src={avatar} name={owner} plus={plus} className="size-[2.6em]" />}
            <p className="min-w-0">
              {/* só o @ de quem é: o nome do mural fica no topo do quadro (desktop) */}
              <span className="block text-[0.95em] leading-tight font-bold break-words">{owner ? `@${owner}` : title}</span>
              {/* contagem de visualizações do perfil (visitantes diferentes que abriram o mural) */}
              {visits !== undefined && (
                <span className={`mt-[0.3em] flex items-center gap-[0.35em] text-[0.8em] ${dark ? "text-white/60" : "text-[#8a7b69]"}`}>
                  <svg viewBox="0 0 24 24" className="size-[1.1em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {visits.toLocaleString("pt-BR")} {visits === 1 ? "visualização" : "visualizações"}
                </span>
              )}
            </p>
          </div>
          {plus && (
            <span className="shrink-0 rounded-lg bg-gradient-to-r from-[#f2c230] to-[#e39a1c] px-[0.8em] py-[0.3em] text-[0.7em] leading-none font-bold tracking-wide text-[#3a2300] shadow-[0_0.15em_0.5em_rgba(150,90,0,.4)]">
              ★ PLUS
            </span>
          )}
        </header>
      )}
      {open ? null : unlocked ? (
        <div className="rise" role="status">
          <p className="text-[1.05em] leading-tight font-semibold">🔓 Mural desbloqueado</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <label htmlFor={inputId} className="flex items-start gap-[0.5em] text-[1.15em] leading-snug font-bold">
            <span className={dark ? "mt-[0.2em] text-white/60" : "mt-[0.2em] text-[#8a7b69]"}>
              <LockIcon />
            </span>
            <span>{question}</span>
          </label>
          <input
            id={inputId}
            data-focus-target
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (hint) setHint(null);
            }}
            type={password ? "password" : "text"}
            autoComplete={password ? "current-password" : "off"}
            placeholder={password ? "Digite a senha..." : "Digite sua resposta..."}
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
