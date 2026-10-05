"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { callbackUrl, homeRouteFor, rememberNext, safeNext, takeNext, useSession } from "@/lib/auth";
import { passwordProblem } from "@/lib/password";
import { PasswordHints } from "@/components/PasswordHints";
import { getBrowserSupabase, getRememberedEmail, setRemember } from "@/lib/supabase";
import { AuthShell, Field, ghostButton, inputClass, NicknameField, primaryButton, Spinner, useNicknameStatus } from "@/components/ui";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

type Mode = "login" | "signup";

export default function Entrar() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<Mode>("signup");
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

  // veio de "Entrar no meu mural": abre direto na aba Entrar. `next` = mural que a pessoa queria abrir
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("modo") === "entrar") setMode("login");
    const next = safeNext(q.get("next"));
    if (next) rememberNext(next);
  }, []);

  // já logado: volta para onde estava (um mural) ou vai para o próprio mural
  useEffect(() => {
    if (!session) return;
    const next = takeNext();
    if (next) return router.replace(next);
    homeRouteFor(getBrowserSupabase()).then((to) => router.replace(to));
  }, [session, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const mail = email.trim();
    if (mode === "signup" && nickState !== "ok") return setError(nickState === "taken" ? "Esse nome de usuário já está em uso." : "Escolha um nome de usuário válido.");
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setError("Digite um e-mail válido.");
    if (!password) return setError("Digite a sua senha.");
    if (mode === "signup") {
      const problem = passwordProblem(password, { email: mail, username: nick });
      if (problem) return setError(problem);
    }
    setBusy(true);
    setError(null);
    const sb = getBrowserSupabase();

    if (mode === "login") {
      setRemember(remember, mail);
      const { error: err } = await sb.auth.signInWithPassword({ email: mail, password });
      setBusy(false);
      if (err) setError(err.status === 400 ? "E-mail ou senha incorretos." : "Não foi possível entrar agora. Tente de novo.");
      return; // sucesso: o useSession dispara o redirecionamento
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
    // e-mail já cadastrado (com confirmação ligada, o Supabase devolve um usuário "vazio")
    if (data.user && data.user.identities?.length === 0) {
      setError("Esse e-mail já tem conta. Entre com a sua senha.");
      return;
    }
    // sem sessão = o projeto ainda exige confirmação por e-mail
    if (!data.session) setNeedsConfirm(true);
  }

  async function google() {
    setError(null);
    const { error: err } = await getBrowserSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (err) setError("Não foi possível entrar com o Google.");
  }

  if (loading || session) {
    return (
      <AuthShell>
        <Spinner />
      </AuthShell>
    );
  }

  if (needsConfirm) {
    return (
      <AuthShell>
        <div role="status">
          <h1 className="font-title text-2xl font-semibold">Confirme seu e-mail ✉️</h1>
          <p className="mt-3 text-[#4a3826]">
            Enviamos um link de confirmação para <strong>{email.trim()}</strong>. Depois de confirmar, volte aqui e entre com a sua senha.
          </p>
          <button
            type="button"
            onClick={() => {
              setNeedsConfirm(false);
              setMode("login");
            }}
            className={`${ghostButton} mt-6`}
          >
            Já confirmei, quero entrar
          </button>
        </div>
      </AuthShell>
    );
  }

  const signup = mode === "signup";

  return (
    <AuthShell>
      <h1 className="font-title text-2xl font-semibold">{signup ? "Crie o seu mural" : "Bem-vindo de volta"}</h1>
      <p className="mt-2 text-[#4a3826]">
        {signup ? "Crie sua conta para montar o seu mural e compartilhar com quem realmente te conhece." : "Entre para ver e editar o seu mural."}
      </p>

      <div role="tablist" aria-label="Entrar ou criar conta" className="mt-5 grid grid-cols-2 rounded-xl border border-[#e1d3ba] bg-white/60 p-1">
        {(["signup", "login"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`cursor-pointer rounded-lg py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#d98a2b] ${
              mode === m ? "bg-[#1f232b] text-white" : "text-[#4a3826] hover:bg-[#efe4cf]"
            }`}
          >
            {m === "signup" ? "Criar conta" : "Entrar"}
          </button>
        ))}
      </div>

      {GOOGLE_ENABLED && (
        <>
          <button type="button" onClick={google} className={`${ghostButton} mt-5 w-full bg-white/70`}>
            Continuar com o Google
          </button>
          <p className="my-4 text-center text-sm text-[#6b5440]">ou</p>
        </>
      )}

      <form onSubmit={submit} noValidate className={`space-y-4 ${GOOGLE_ENABLED ? "" : "mt-5"}`}>
        {signup && <NicknameField value={nick} onChange={(v) => { setNick(v); setError(null); }} state={nickState} />}
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
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-pressed={show}
                className="absolute inset-y-0 right-3 cursor-pointer text-sm font-semibold text-[#6b5440] hover:text-[#2f2218]"
              >
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
    </AuthShell>
  );
}
