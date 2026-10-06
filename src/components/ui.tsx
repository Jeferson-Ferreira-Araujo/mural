"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { cleanNickname, NICK_RE, nicknameAvailable } from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import { Brand } from "./Brand";
import { BOARD_IMAGE } from "./DesktopBoard";

/** Fundo e cartão centralizado usados nas telas de conta (entrar, criar, painel). */
export function AuthShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="relative grid min-h-dvh grid-cols-[minmax(0,1fr)] place-items-center overflow-x-hidden bg-[#2a1a0e] px-3 py-6 sm:px-4 sm:py-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BOARD_IMAGE} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-xl" />
      <span aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_30%,rgba(60,30,8,.2),rgba(14,7,2,.8))]" />
      <div className={`rise relative w-full min-w-0 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="relative mb-2 flex justify-center">
          <Link
            href="/"
            aria-label="Voltar ao início"
            title="Voltar ao início"
            className="absolute top-0 left-0 inline-flex h-10 items-center gap-0.5 rounded-xl pr-2 pl-1 text-sm font-medium text-[#fbf3e2]/75 transition hover:text-[#fbf3e2] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 5-7 7 7 7" />
            </svg>
            Voltar
          </Link>
          <Brand className="h-[5.5rem] sm:h-[6.5rem]" />
        </div>
        <main className="paper-grain rounded-[1.4rem] border border-[#e6d8bd] bg-[#fbf6ea] p-5 text-[#2f2218] shadow-[0_1.5rem_4rem_rgba(0,0,0,.5)] sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-[#e1d3ba] bg-white/80 px-4 py-3 text-base text-[#2f2218] outline-none placeholder:text-[#8a7b69] focus:border-[#b8873b] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#d98a2b]/50";

export const primaryButton =
  "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f232b] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[#2c313b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

export const ghostButton =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#d9c9ad] bg-transparent px-5 py-3 text-base font-semibold text-[#4a3826] transition-colors hover:bg-[#efe4cf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-[#a23b2a]">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-[#6b5440]">{hint}</p>
      ) : null}
    </div>
  );
}

export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <p role="status" className="py-8 text-center text-[#6b5440]">
      {label}
    </p>
  );
}

export type NickState = "idle" | "checking" | "ok" | "taken" | "invalid";

/** Verifica (com pequena espera) se o nickname é válido e está livre. */
export function useNicknameStatus(nick: string): NickState {
  const [state, setState] = useState<NickState>("idle");
  useEffect(() => {
    if (!nick) return setState("idle");
    if (!NICK_RE.test(nick)) return setState("invalid");
    setState("checking");
    let cancelled = false;
    const t = setTimeout(async () => {
      const ok = await nicknameAvailable(getBrowserSupabase(), nick);
      if (!cancelled) setState(ok ? "ok" : "taken");
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [nick]);
  return state;
}

const nickMessage: Record<NickState, string | null> = {
  idle: null,
  checking: "Verificando…",
  ok: "Disponível ✓",
  taken: "Esse nome de usuário já está em uso.",
  invalid: "Use de 3 a 30 letras minúsculas, números ou underline (_).",
};

/** Campo de nickname: ele vira o endereço do mural (SITE_HOST/nickname). */
export function NicknameField({
  value,
  onChange,
  state,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  state: NickState;
  autoFocus?: boolean;
}) {
  const bad = state === "taken" || state === "invalid";
  return (
    <Field
      label="Nome de usuário"
      error={bad ? nickMessage[state] : null}
      hint={nickMessage[state]}
    >
      {(id) => (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(cleanNickname(e.target.value))}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={30}
          placeholder="seu_usuario"
          autoFocus={autoFocus}
          aria-invalid={bad}
          className={inputClass}
        />
      )}
    </Field>
  );
}

/** Mostra uma URL em destaque, com botão para copiar (para a pessoa guardar ou enviar). */
export function AddressBox({ url, label = "Endereço do seu mural" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`https://${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sem permissão de área de transferência */
    }
  }
  return (
    <div className="rounded-xl border border-[#e1d3ba] bg-white/60 p-3 sm:p-4">
      <p className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">{label}</p>
      <div className="mt-1.5 flex items-center gap-3">
        <p className="min-w-0 flex-1 text-[15px] font-semibold break-all text-[#2f2218]">{url}</p>
        <button type="button" onClick={copy} className={`${ghostButton} shrink-0 !px-3.5 !py-2 text-sm`}>
          {copied ? "Copiado ✓" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

const QUESTION_SUGGESTIONS = [
  "Qual era meu apelido na escola?",
  "Qual é a minha comida favorita?",
  "Em que cidade eu nasci?",
  "Qual é o meu time do coração?",
  "Qual foi o nome do meu primeiro animal de estimação?",
  "Qual é a minha cor favorita?",
  "Qual era meu desenho animado favorito na infância?",
  "Qual foi o meu primeiro emprego?",
  "Qual é a minha música favorita?",
  "Qual é o meu filme favorito?",
  "Qual era o nome da minha escola?",
  "Qual foi o primeiro lugar que viajamos juntos?",
];

/** Botão que abre uma lista de sugestões de pergunta; ao escolher, preenche o campo. */
export function QuestionSuggestions({ onPick }: { onPick: (q: string) => void }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={listId}
        className="cursor-pointer text-sm font-semibold text-[#6b5440] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#d98a2b]"
      >
        💡 {open ? "Esconder sugestões" : "Ver sugestões de perguntas"}
      </button>
      {open && (
        <ul id={listId} className="rise mt-2 flex flex-col gap-1.5">
          {QUESTION_SUGGESTIONS.map((q) => (
            <li key={q}>
              <button
                type="button"
                onClick={() => {
                  onPick(q);
                  setOpen(false);
                }}
                className="w-full cursor-pointer rounded-xl border border-[#e1d3ba] bg-white/60 px-3.5 py-2.5 text-left text-sm text-[#2f2218] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-[#d98a2b]"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
