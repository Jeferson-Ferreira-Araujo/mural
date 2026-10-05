"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { callbackUrl, homeRouteFor, takeNext } from "@/lib/auth";
import { passwordProblem } from "@/lib/password";
import { PasswordHints } from "@/components/PasswordHints";
import { getBrowserSupabase, getRememberedEmail, setRemember } from "@/lib/supabase";
import { Field, inputClass, NicknameField, primaryButton, useNicknameStatus } from "./ui";

type Mode = "login" | "signup";

/**
 * Entrar / Criar conta direto na tela inicial: já abre com e-mail e senha; a outra aba cria a conta.
 * Ao entrar, a sessão muda e a tela se atualiza sozinha (quem usa observa `useSession`).
 */
export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [nick, setNick] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRememberState] = useState(true);
  // e-mail lembrado do último login (a senha fica por conta do gerenciador do navegador)
  useEffect(() => setEmail((cur) => cur || getRememberedEmail()), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const nickState = useNicknameStatus(mode === "signup" ? nick : "");
  const signup = mode === "signup";

  async function submit(e: FormEvent) {
    e.preventDefault();
    const mail = email.trim();
    if (signup && nickState !== "ok") return setError(nickState === "taken" ? "Esse nome de usuário já está em uso." : "Escolha um nome de usuário válido.");
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setError("Digite um e-mail válido.");
    if (!password) return setError("Digite a sua senha.");
    if (mode === "signup") {
      const problem = passwordProblem(password, { email: mail, username: nick });
      if (problem) return setError(problem);
    }
    setBusy(true);
    setError(null);
    const sb = getBrowserSupabase();

    if (!signup) {
      setRemember(remember, mail);
      const { error: err } = await sb.auth.signInWithPassword({ email: mail, password });
      setBusy(false);
      if (err) {
        setError(err.status === 400 ? "E-mail ou senha incorretos." : "Não foi possível entrar agora. Tente de novo.");
        return;
      }
      router.push(takeNext() ?? (await homeRouteFor(getBrowserSupabase()))); // entrou: já mostra o mural dela
      return;
    }

    const { data, error: err } = await sb.auth.signUp({ email: mail, password, options: { emailRedirectTo: callbackUrl(), data: { nickname: nick } } });
    setBusy(false);
    if (err) {
      if (/registered|already/i.test(err.message)) setError("Esse e-mail já tem conta. Entre com a sua senha.");
      else if (/password/i.test(err.message)) setError("Senha muito fraca. Use letras, números e mais caracteres.");
      else if (/database error/i.test(err.message)) setError("Esse nome de usuário acabou de ser usado. Escolha outro.");
      else if (err.status === 429) setError("Muitas tentativas. Aguarde um pouco e tente de novo.");
      else setError("Não foi possível criar a conta agora. Tente de novo.");
      return;
    }
    if (data.user && data.user.identities?.length === 0) return setError("Esse e-mail já tem conta. Entre com a sua senha.");
    if (!data.session) setNeedsConfirm(true);
    else router.push(takeNext() ?? (await homeRouteFor(getBrowserSupabase()))); // conta criada (o primeiro mural já nasce junto)
  }

  if (needsConfirm) {
    return (
      <section role="status" className="rounded-2xl bg-[#fbf6ea] p-5 text-[15px] text-[#2f2218] shadow-[0_0.8rem_2rem_rgba(0,0,0,.3)]">
        <p className="font-title text-xl font-semibold">Confirme seu e-mail ✉️</p>
        <p className="mt-2 text-[#4a3826]">
          Enviamos um link para <strong>{email.trim()}</strong>. Depois de confirmar, volte aqui e entre.
        </p>
        <button
          type="button"
          onClick={() => {
            setNeedsConfirm(false);
            setMode("login");
          }}
          className={`${primaryButton} mt-4`}
        >
          Já confirmei, quero entrar
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Entrar ou criar conta" className="intro-form rounded-2xl bg-[#fbf6ea] p-4 text-[15px] text-[#2f2218] shadow-[0_0.8rem_2rem_rgba(0,0,0,.3)]">
      <div role="tablist" aria-label="Entrar ou criar conta" className="grid grid-cols-2 rounded-xl border border-[#e1d3ba] bg-white/60 p-1">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`cursor-pointer rounded-lg py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#d98a2b] ${mode === m ? "bg-[#1f232b] text-white" : "text-[#4a3826] hover:bg-[#efe4cf]"}`}
          >
            {m === "login" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} noValidate className="mt-4 space-y-3">
        {signup && (
          <NicknameField
            value={nick}
            onChange={(v) => {
              setNick(v);
              setError(null);
            }}
            state={nickState}
          />
        )}
        <Field label="E-mail">
          {(id) => (
            <input
              id={id}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="voce@email.com"
              className={inputClass}
            />
          )}
        </Field>
        <Field label="Senha" error={error}>
          {(id) => (
            <div className="relative">
              <input
                id={id}
                type={show ? "text" : "password"}
                autoComplete={signup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className={`${inputClass} pr-20`}
              />
              <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} className="absolute inset-y-0 right-3 cursor-pointer text-sm font-semibold text-[#6b5440] hover:text-[#2f2218]">
                {show ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          )}
        </Field>
        {!signup && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#4a3826]">
            <input type="checkbox" checked={remember} onChange={(e) => setRememberState(e.target.checked)} className="size-4 cursor-pointer accent-[#1f232b]" />
            Lembrar senha
          </label>
        )}
        {signup && <PasswordHints password={password} email={email} username={nick} />}
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "Aguarde…" : signup ? "Criar conta" : "Entrar"}
        </button>
      </form>
    </section>
  );
}
