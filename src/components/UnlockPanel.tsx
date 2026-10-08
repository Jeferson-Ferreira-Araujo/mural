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
  /** "form": só o cartão de pergunta, grande, para o centro do quadro (desktop); "profile": só o perfil (sem a pergunta); padrão: tudo junto */
  part?: "form" | "profile";
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
export function UnlockPanel({ question, unlocked, onSubmit, inputId, tone = "light", title, owner, avatar, open = false, password = false, plus = false, visits, part }: Props) {
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

  if (part === "form") {
    if (unlocked || open) return null;
    return (
      <section aria-label="Acesso ao mural" className="rise w-full max-w-[28em] rounded-[1.4em] border border-white/15 bg-[#1c1510]/88 p-[1.8em] text-center text-[#f6efe2] shadow-[0_1em_3em_rgba(0,0,0,.6)] backdrop-blur-md">
        <span className="mx-auto grid size-[3.2em] place-items-center rounded-full bg-[#f2c230] text-[1.2em] text-[#2a1c12]">
          <LockIcon />
        </span>
        <p className="mt-[0.9em] text-[0.8em] font-semibold tracking-[0.16em] text-[#f2c230] uppercase">{password ? "Mural compartilhado" : "Mural trancado"}</p>
        <h2 className="font-title mt-[0.45em] text-[1.9em] leading-tight font-semibold [overflow-wrap:anywhere]">{question}</h2>
        <p className="mt-[0.6em] text-[0.95em] text-white/75">
          {password ? "Digite a senha para entrar." : owner ? `Só entra no mural de @${owner} quem acertar a resposta.` : "Só entra no mural quem acertar a resposta."}
        </p>
        <form onSubmit={submit} noValidate className="mt-[1.2em] text-left">
          <label htmlFor={inputId} className="sr-only">
            {question}
          </label>
          <input
            id={inputId}
            data-focus-target
            autoFocus
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
            className="w-full rounded-[0.7em] border border-transparent bg-[#e9e5df] px-[1em] py-[0.8em] text-[1.05em] text-[#2f2218] outline-none placeholder:text-[#8a7b69] focus-visible:ring-2 focus-visible:ring-[#f2c230]/80"
          />
          {hint && (
            <p id={`${inputId}-hint`} role="alert" className="mt-[0.5em] text-[0.9em] text-[#ffb4a2]">
              {hint}
            </p>
          )}
          <button type="submit" disabled={busy} className="mt-[0.9em] flex w-full cursor-pointer items-center justify-center gap-[0.5em] rounded-[0.7em] bg-[#f2c230] px-[1em] py-[0.85em] text-[1.05em] font-bold text-[#2a1c12] transition hover:bg-[#f7cd45] disabled:opacity-70">
            {busy ? "Verificando…" : "Desbloquear"}
            <svg viewBox="0 0 24 24" className="size-[1.1em]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      </section>
    );
  }

  const profileOnly = part === "profile" && !unlocked && !open; // desktop trancado: a pergunta vai para o centro do quadro

  return (
    <section
      aria-label="Acesso ao mural"
      className={
        dark
          ? "rounded-[1.1em] border border-white/15 bg-[#1c1510]/70 p-[1.2em] text-[#f6efe2] shadow-[0_0.6em_2em_rgba(0,0,0,.45)] backdrop-blur-md"
          : "p-[0.2em] text-[#2f2218]"
      }
    >
      {title && (
        <header className={`flex flex-col gap-[0.5em] ${open || profileOnly ? "" : `mb-[0.9em] border-b pb-[0.8em] ${dark ? "border-white/10" : "border-[#e6d8bd]"}`}`}>
          {plus && (
            <span className="self-end rounded-lg bg-gradient-to-r from-[#f2c230] to-[#e39a1c] px-[0.8em] py-[0.3em] text-[0.7em] leading-none font-bold tracking-wide text-[#3a2300] shadow-[0_0.15em_0.5em_rgba(150,90,0,.4)]">
              ★ PLUS
            </span>
          )}
          <div className="flex min-w-0 items-center gap-[0.7em]">
            {owner && <Avatar src={avatar} name={owner} plus={plus} className="size-[2.6em] lg:size-[6.2em]" />}
            <p className="min-w-0">
              {/* só o @ de quem é: o nome do mural fica no topo do quadro (desktop) */}
              <span className="block text-[0.95em] leading-tight font-bold break-words lg:text-[1.45em]">{owner ? `@${owner}` : title}</span>
              {/* contagem de visualizações do perfil (visitantes diferentes que abriram o mural) */}
              {visits !== undefined && (
                <span className={`mt-[0.3em] flex items-center gap-[0.35em] whitespace-nowrap text-[0.8em] leading-none lg:text-[1.05em] ${dark ? "text-white/60" : "text-[#8a7b69]"}`}>
                  <svg viewBox="0 0 24 24" className="size-[1.1em] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {visits.toLocaleString("pt-BR")} {visits === 1 ? "visualização" : "visualizações"}
                </span>
              )}
            </p>
          </div>
        </header>
      )}
      {profileOnly ? (
        <p className={`mt-[0.8em] flex items-center gap-[0.5em] text-[0.85em] font-semibold ${dark ? "text-white/70" : "text-[#6b5440]"}`}>
          <LockIcon />
          Responda à pergunta no centro do mural para entrar.
        </p>
      ) : open ? null : unlocked ? (
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
