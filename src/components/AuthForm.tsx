"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { callbackUrl, homeRouteFor, takeNext } from "@/lib/auth";
import { passwordProblem } from "@/lib/password";
import { PasswordHints } from "@/components/PasswordHints";
import { getBrowserSupabase, getRememberedEmail, setRemember } from "@/lib/supabase";
import { checkSignup, NAME_DENIED_TEXT, sendEmailCode } from "@/lib/reserved";
import { BIRTH_ERROR, BirthField, isUnder13, toIso } from "./account/BirthField";
import { CodeStep } from "./CodeStep";
import { OAuthButtons } from "./OAuthButtons";
import { Field, inputClass, NicknameField, primaryButton, useNicknameStatus } from "./ui";
import { useLit } from "@/i18n/literal";

/** Quem já informou uma idade abaixo do mínimo não consegue tentar de novo outra data neste aparelho. */
const MINOR_KEY = "pinz:minor";
const blockedMinor = () => {
  try {
    return localStorage.getItem(MINOR_KEY) === "1";
  } catch {
    return false;
  }
};
const markMinor = () => {
  try {
    localStorage.setItem(MINOR_KEY, "1");
  } catch {}
};

type Mode = "login" | "signup";

/** Qual aba o formulário abre (o celular escolhe Entrar ou Criar conta nos botões do topo da tela inicial). */
export const authIntent: { mode: Mode; /** a pessoa escolheu a aba num dos botões da tela inicial do celular: vale mais que o endereço */ touched?: boolean } = { mode: "login" };

/**
 * Entrar / Criar conta direto na tela inicial: já abre com e-mail e senha; a outra aba cria a conta.
 * Ao entrar, a sessão muda e a tela se atualiza sozinha (quem usa observa `useSession`).
 */
export function AuthForm({ initialMode }: { /** aba pedida pelo endereço (/entrar) */ initialMode?: Mode } = {}) {
  const tl = useLit();
  const router = useRouter();
  const t = useTranslations("auth");
  const [mode, setMode] = useState<Mode>(() => (authIntent.touched ? authIntent.mode : (initialMode ?? authIntent.mode)));
  const [nick, setNick] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birth, setBirth] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRememberState] = useState(true);
  // e-mail lembrado do último login (a senha fica por conta do gerenciador do navegador)
  useEffect(() => setEmail((cur) => cur || getRememberedEmail()), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resent, setResent] = useState<string | null>(null);
  const [otp, setOtp] = useState(""); // código de confirmação que chega por e-mail
  const [otpBusy, setOtpBusy] = useState(false);
  const [codeStep, setCodeStep] = useState(false); // nome reservado: confirmação por código enviado ao e-mail
  const nickState = useNicknameStatus(mode === "signup" ? nick : "");
  const signup = mode === "signup";

  async function submit(e: FormEvent) {
    e.preventDefault();
    const mail = email.trim();
    if (signup && nickState !== "ok") return setError(nickState === "taken" ? t("errors.nickTaken") : t("errors.nickInvalid"));
    let birthIso: string | null = null;
    if (signup) {
      birthIso = toIso(birth);
      if (!birthIso) return setError(tl("Informe sua data de nascimento (dia/mês/ano)."));
      if (isUnder13(birthIso) || blockedMinor()) {
        markMinor();
        return setError(tl(BIRTH_ERROR.too_young));
      }
    }
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setError(t("errors.emailInvalid"));
    if (!password) return setError(t("errors.passwordRequired"));
    if (mode === "signup") {
      const problem = passwordProblem(password, { email: mail, username: nick });
      if (problem) return setError(tl(problem));
    }
    setBusy(true);
    setError(null);
    const sb = getBrowserSupabase();

    // nome de empresa (lista reservada): só com e-mail do domínio dela e confirmação por código; qualquer outro é recusado
    if (signup) {
      const check = await checkSignup(sb, nick, mail);
      if (check === "denied") {
        setBusy(false);
        return setError(tl(NAME_DENIED_TEXT));
      }
      if (check === "verify") {
        const sent = await sendEmailCode(sb, mail, nick);
        setBusy(false);
        if (!sent) return setError(t("errors.codeFail"));
        setCodeStep(true);
        return;
      }
    }

    if (!signup) {
      setRemember(remember, mail);
      const { error: err } = await sb.auth.signInWithPassword({ email: mail, password });
      setBusy(false);
      if (err) {
        if (err.code === "email_not_confirmed" || /not confirmed/i.test(err.message)) {
          setError(null);
          setNeedsConfirm(true); // vai para a tela do código
          return;
        }
        setError(err.status === 400 ? t("errors.badCredentials") : t("errors.loginFail"));
        return;
      }
      router.push(takeNext() ?? (await homeRouteFor(getBrowserSupabase()))); // entrou: já mostra o mural dela
      return;
    }

    const { data, error: err } = await sb.auth.signUp({ email: mail, password, options: { emailRedirectTo: callbackUrl(), data: { nickname: nick, birth: birthIso } } });
    setBusy(false);
    if (err) {
      if (/registered|already/i.test(err.message)) setError(t("errors.emailExists"));
      else if (/password/i.test(err.message)) setError(t("errors.weakPassword"));
      else if (/database error/i.test(err.message)) setError(t("errors.nickJustTaken"));
      else if (err.status === 429) setError(t("errors.tooMany"));
      else setError(t("errors.signupFail"));
      return;
    }
    if (data.user && data.user.identities?.length === 0) return setError(t("errors.emailExists"));
    if (!data.session) setNeedsConfirm(true);
    else router.push(takeNext() ?? (await homeRouteFor(getBrowserSupabase()))); // conta criada (o primeiro mural já nasce junto)
  }

  async function resend() {
    setResent(null);
    const { error: err } = await getBrowserSupabase().auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: callbackUrl() } });
    setResent(err ? (err.status === 429 ? t("errors.tooMany") : t("errors.signupFail")) : tl("Enviamos o e-mail de novo. Confira a caixa de entrada e o spam."));
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    const code = otp.replace(/\s/g, "");
    if (otpBusy) return;
    if (!/^\d{6,10}$/.test(code)) return setResent(tl("Digite o código que chegou no seu e-mail."));
    setOtpBusy(true);
    setResent(null);
    const sb = getBrowserSupabase();
    const { error: err } = await sb.auth.verifyOtp({ email: email.trim(), token: code, type: "signup" });
    setOtpBusy(false);
    if (err) return setResent(tl("Código incorreto ou vencido. Confira os números ou peça um novo."));
    router.push(takeNext() ?? (await homeRouteFor(sb))); // confirmou: a sessão já começou
  }

  if (codeStep) {
    return (
      <CodeStep
        email={email.trim()}
        nick={nick}
        password={password}
        onBack={() => setCodeStep(false)}
        onDone={async () => router.push(takeNext() ?? (await homeRouteFor(getBrowserSupabase())))}
      />
    );
  }

  if (needsConfirm) {
    return (
      <section role="status" className="rounded-2xl bg-[#fbf6ea] p-5 text-[15px] text-[#2f2218] shadow-[0_0.8rem_2rem_rgba(0,0,0,.3)]">
        <p className="font-title text-xl font-semibold">{t("confirm.title")}</p>
        <p className="mt-2 text-[#4a3826]">{tl("Enviamos um código para {email}. Digite-o abaixo para confirmar sua conta.").replace("{email}", email.trim())}</p>
        <form onSubmit={verifyOtp} noValidate className="mt-3 space-y-3">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={10}
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, ""));
              setResent(null);
            }}
            placeholder="000000"
            aria-label={tl("Código de confirmação")}
            className={`${inputClass} text-center text-xl tracking-[0.35em]`}
          />
          {resent && <p role="status" className="text-sm text-[#4a3826]">{resent}</p>}
          <button type="submit" disabled={otpBusy} className={primaryButton}>
            {otpBusy ? t("wait") : tl("Confirmar")}
          </button>
        </form>
        <button type="button" onClick={() => void resend()} className="mt-3 cursor-pointer text-sm font-semibold text-[#6b5440] underline">
          {tl("Não recebeu? Enviar o e-mail de novo")}
        </button>
        <button
          type="button"
          onClick={() => {
            setNeedsConfirm(false);
            setMode("login");
          }}
          className="mt-3 block cursor-pointer text-sm font-semibold text-[#6b5440] underline"
        >
          {t("confirm.done")}
        </button>
      </section>
    );
  }

  return (
    <section aria-label={t("aria")} className="intro-form auth-card rounded-2xl bg-[#fbf6ea] p-4 text-[15px] text-[#2f2218] shadow-[0_0.8rem_2rem_rgba(0,0,0,.3)]">
      <div role="tablist" aria-label={t("aria")} className="grid grid-cols-2 rounded-xl border border-[#e1d3ba] bg-white/60 p-1">
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
            {m === "login" ? t("tabLogin") : t("tabSignup")}
          </button>
        ))}
      </div>

      <OAuthButtons onError={setError} className="mt-4" />

      <form onSubmit={submit} noValidate className="mt-3 space-y-3">
        <Field label={t("email")}>
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
              placeholder={t("emailPlaceholder")}
              className={`${inputClass} md:!px-3 md:!text-[0.9rem]`}
            />
          )}
        </Field>
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
        {signup && <BirthField value={birth} onChange={(v) => { setBirth(v); setError(null); }} />}
        <Field label={t("password")} error={error}>
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
                {show ? t("hide") : t("show")}
              </button>
            </div>
          )}
        </Field>
        {!signup && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#4a3826]">
            <input type="checkbox" checked={remember} onChange={(e) => setRememberState(e.target.checked)} className="size-4 cursor-pointer accent-[#1f232b]" />
            {t("remember")}
          </label>
        )}
        {signup && <PasswordHints password={password} email={email} username={nick} />}
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? t("wait") : signup ? t("tabSignup") : t("tabLogin")}
        </button>
      </form>
    </section>
  );
}
