"use client";

import { useEffect, useState, type ElementType, type FormEvent } from "react";
import type { UnlockResult } from "@/lib/mural";
import { Avatar } from "./Avatar";
import { ShareButton } from "./ShareButton";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";
import { useTag } from "@/i18n/useTag";

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
  /** dono com PINZ+: borda dourada na foto e selo PINZ+ no cabeçalho */
  plus?: boolean;
  /** quantos acessos o perfil teve (não aparece sem o número) */
  visits?: number;
  /** seguidores e quantos pins a pessoa já colocou nos murais dos outros (só o número) */
  followers?: number | null;
  placed?: number | null;
  /** mural compartilhado: pede a senha (campo escondido) em vez de uma pergunta */
  password?: boolean;
  /** mural compartilhado com pergunta de segurança: o campo mostra o que se digita (é uma resposta, não uma senha) */
  plainAnswer?: boolean;
  /** "form": só o cartão de pergunta, grande, para o centro do quadro (desktop); "profile": só o perfil (sem a pergunta); padrão: tudo junto */
  part?: "form" | "profile";
  /** tocar na foto/nome abre o resumo do perfil */
  onProfile?: () => void;
  /** botão de compartilhar o perfil, na mesma faixa da foto e do nome (visitando o mural de outra pessoa) */
  shareProfile?: { path: string; onNotify: (m: string) => void };
  /** 3 erros seguidos: até quando (ms) a pessoa fica sem poder tentar; o campo e o botão somem */
  blockedUntil?: number | null;
  onBlock?: (seconds: number) => void;
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
export function UnlockPanel({ question, unlocked, onSubmit, inputId, tone = "light", title, owner, avatar, open = false, password = false, plainAnswer = false, plus = false, visits, followers, placed, part, onProfile, shareProfile, blockedUntil, onBlock }: Props) {
  const tl = useLit();
  const tx = useTranslations("components.UnlockPanel");
  const tag = useTag();
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [blockMsg, setBlockMsg] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const dark = tone === "dark";
  const blocked = !password && !!blockedUntil && blockedUntil > Date.now();
  // quando o bloqueio acaba, a tela volta a mostrar o campo sozinha
  useEffect(() => {
    if (!blockedUntil) return;
    const ms = blockedUntil - Date.now();
    if (ms <= 0) return;
    const t = window.setTimeout(() => (setBlockMsg(null), setTick((n) => n + 1)), ms + 200);
    return () => window.clearTimeout(t);
  }, [blockedUntil]);
  const blockedText = blocked ? blockMsg ?? (() => { const m = Math.max(1, Math.ceil(((blockedUntil ?? 0) - Date.now()) / 60000)); return tx("x_wait", { m }); })() : "";
  const Wrap: ElementType = onProfile ? "button" : "div"; // foto e nome abrem o resumo do perfil
  const wrapProps = onProfile ? { type: "button" as const, onClick: onProfile, "aria-label": tx("x_viewProfile", { owner: owner ?? "" }) } : {};

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!answer.trim()) {
      setHint(password ? tx("m_digiteASenhaParaEntrar") : tx("m_escrevaUmaRespostaParaEntrar"));
      return;
    }
    setBusy(true);
    const res = await onSubmit(answer);
    setBusy(false);
    if (res.ok) return;
    if (res.reason === "wrong" && password) setHint(plainAnswer ? tx("m_essaNaoEAResposta") : tx("m_senhaIncorreta"));
    else if (res.reason === "wrong") {
      if ((res.fails ?? 0) >= 3) {
        setBlockMsg(tx("x_wrongMany", { who: owner ? `@${owner}` : tl("essa pessoa") }));
        setHint(null);
        setAnswer("");
        onBlock?.(res.retryAfter ?? 1800);
      } else setHint(res.fails === 2 ? tx("m_eitaAindaNaoAcertou") : tx("m_essaNaoEAResposta"));
    } else if (res.reason === "rate_limited") {
      if (password) setHint(tx("m_muitasTentativasTenteNovamenteEm", { v0: Math.max(1, Math.ceil((res.retryAfter ?? 600) / 60)) }));
      else {
        setBlockMsg(null);
        onBlock?.(res.retryAfter ?? 1800);
      }
    } else setHint(tx("m_naoFoiPossivelVerificarAgora"));
  }

  if (part === "form") {
    if (unlocked || open) return null;
    if (blocked)
      return (
        <section aria-label={tx("muralBloqueado")} className="rise w-full max-w-[28em] rounded-[1.4em] border border-white/15 bg-[#1c1510]/88 p-[1.8em] text-center text-[#f6efe2] shadow-[0_1em_3em_rgba(0,0,0,.6)] backdrop-blur-md">
          {!password && owner && (
            <div className="mb-[1.1em] flex flex-col items-center gap-[0.5em]">
              <Avatar src={avatar} name={owner} plus={plus} className="size-[4.6em]" />
              <p className="text-[1.1em] font-bold [overflow-wrap:anywhere]">@{owner}</p>
            </div>
          )}
          <span className="mx-auto grid size-[3.2em] place-items-center rounded-full bg-[#f2c230] text-[1.2em] text-[#2a1c12]">
            <LockIcon />
          </span>
          <h2 className="font-title mt-[0.9em] text-[1.7em] leading-tight font-semibold">{tx("muralBloqueado")}</h2>
          <p role="status" className="mt-[0.6em] text-[1em] text-white/80">
            {blockedText}
          </p>
        </section>
      );
    return (
      <section aria-label={tx("acessoAoMural")} className="rise w-full max-w-[28em] rounded-[1.4em] border border-white/15 bg-[#1c1510]/88 p-[1.8em] text-center text-[#f6efe2] shadow-[0_1em_3em_rgba(0,0,0,.6)] backdrop-blur-md">
        {!password && owner && (
          <div className="mb-[1.1em] flex flex-col items-center gap-[0.5em]">
            <Avatar src={avatar} name={owner} plus={plus} className="size-[4.6em]" />
            <p className="text-[1.1em] font-bold [overflow-wrap:anywhere]">@{owner}</p>
          </div>
        )}
        <span className="mx-auto grid size-[3.2em] place-items-center rounded-full bg-[#f2c230] text-[1.2em] text-[#2a1c12]">
          <LockIcon />
        </span>
        <p className="mt-[0.9em] text-[0.8em] font-semibold tracking-[0.16em] text-[#f2c230] uppercase">{password ? tx("m_muralCompartilhado") : tx("m_muralPrivado")}</p>
        <h2 className="font-title mt-[0.45em] text-[1.9em] leading-tight font-semibold [overflow-wrap:anywhere]">{question}</h2>
        {password && <p className="mt-[0.6em] text-[0.95em] text-white/75">{tx("digiteASenhaParaEntrar")}</p>}
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
            type={password && !plainAnswer ? "password" : "text"}
            autoComplete={password && !plainAnswer ? "current-password" : "off"}
            placeholder={password ? tx("m_digiteASenha") : tx("m_digiteSuaResposta")}
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
            {busy ? tl("Verificando…") : tl("Desbloquear")}
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
      aria-label={tx("acessoAoMural")}
      className={
        dark
          ? "rounded-[1.1em] border border-white/15 bg-[#1c1510]/70 p-[1.2em] text-[#f6efe2] shadow-[0_0.6em_2em_rgba(0,0,0,.45)] backdrop-blur-md"
          : "p-[0.2em] text-[#2f2218]"
      }
    >
      {/* mural privado trancado: no cartão da pergunta (celular) o cabeçalho não repete a foto e o nome, que já estão no topo da tela */}
      {title && (open || unlocked || part === "profile") && (
        <header className={`flex flex-col gap-[0.5em] ${open || profileOnly ? "" : `mb-[0.9em] border-b pb-[0.8em] ${dark ? "border-white/10" : "border-[#e6d8bd]"}`}`}>
          <div className="flex items-center justify-between gap-[0.6em]">
          <Wrap {...wrapProps} className={`flex min-w-0 items-center gap-[0.7em] text-left ${onProfile ? "cursor-pointer rounded-xl transition hover:opacity-80 active:scale-[0.98]" : ""}`}>
            {owner && <Avatar src={avatar} name={owner} plus={plus} className="size-[2.6em] lg:size-[4.1em]" />}
            <p className="min-w-0">
              {/* só o @ de quem é: o nome do mural fica no topo do quadro (desktop) */}
              <span className="block text-[0.95em] leading-tight font-bold break-words lg:text-[1.45em]">{owner ? `@${owner}` : title}</span>
              {plus && (
                <span className="mt-[0.35em] inline-block rounded-lg bg-gradient-to-r from-[#f2c230] to-[#e39a1c] px-[0.8em] py-[0.3em] text-[0.7em] leading-none font-bold tracking-wide text-[#3a2300] shadow-[0_0.15em_0.5em_rgba(150,90,0,.4)]">{tx("pinz")}</span>
              )}
            </p>
          </Wrap>
          {shareProfile && (
            <ShareButton iconOnly title={tx("x_shareProfileTitle", { owner: owner ?? "" })} text={tx("x_shareProfileText", { owner: owner ?? "" })} path={shareProfile.path} onNotify={shareProfile.onNotify} className={`shrink-0 !size-[2.6em] border ${dark ? "border-white/15 bg-white/10 text-white hover:bg-white/20" : "border-[#d9c9ad] bg-white/60 text-[#2a1c12] hover:bg-white"}`} />
          )}
          </div>
          {/* números do perfil, juntos: visualizações (visitantes diferentes que abriram o mural), seguidores e PINZ que a pessoa já colocou */}
          {(open || unlocked) && (visits !== undefined || followers != null || placed != null) && (
            <ul className={`grid grid-flow-col auto-cols-fr divide-x rounded-[0.9em] border py-[0.7em] text-center ${shareProfile ? "" : "lg:landscape:hidden"} ${dark ? "divide-white/10 border-white/10 text-white/60" : "divide-[#e6d8bd] border-[#e6d8bd] bg-white/40 text-[#8a7b69]"}`}>
              {(
                [
                  visits !== undefined && [visits, visits === 1 ? tl("visualização") : tl("visualizações")],
                  followers != null && [followers, followers === 1 ? tl("seguidor") : tl("seguidores")],
                  placed != null && [placed, placed === 1 ? tl("PINZ colocado") : tl("PINZ colocados")],
                ].filter(Boolean) as [number, string][]
              ).map(([n, label]) => (
                <li key={label} className="min-w-0 px-[0.4em]">
                  <span className={`block text-[1.5em] leading-none font-semibold ${dark ? "text-white" : "text-[#2f2218]"}`}>{n.toLocaleString(tag)}</span>
                  <span className="mt-[0.35em] block text-[0.78em] leading-tight">{label}</span>
                </li>
              ))}
            </ul>
          )}
        </header>
      )}
      {profileOnly ? null : open ? null : unlocked ? (
        <div className="rise" role="status">
          <p className="text-[1.05em] leading-tight font-semibold">{tx("muralDesbloqueado")}</p>
        </div>
      ) : blocked ? (
        <div role="status" className="rise">
          <p className="flex items-center gap-[0.5em] text-[1.15em] leading-snug font-bold">
            {tx.rich("x_muralBloqueado", { n0: () => <LockIcon /> })}</p>
          <p className={`mt-[0.4em] text-[0.95em] ${dark ? "text-white/75" : "text-[#6b5440]"}`}>{blockedText}</p>
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
            type={password && !plainAnswer ? "password" : "text"}
            autoComplete={password && !plainAnswer ? "current-password" : "off"}
            placeholder={password ? tx("m_digiteASenha") : tx("m_digiteSuaResposta")}
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
            {busy ? tl("Verificando…") : tl("Desbloquear")}
            <svg viewBox="0 0 24 24" className="size-[1.1em]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      )}
    </section>
  );
}
