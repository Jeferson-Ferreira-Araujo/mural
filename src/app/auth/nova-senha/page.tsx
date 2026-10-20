"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { PasswordHints } from "@/components/PasswordHints";
import { AuthShell, Field, ghostButton, inputClass, primaryButton, Spinner } from "@/components/ui";
import { homeRouteFor } from "@/lib/auth";
import { passwordProblem } from "@/lib/password";
import { getBrowserSupabase } from "@/lib/supabase";
import { useTranslations } from "next-intl";

/** Destino do link de "trocar a senha" enviado por e-mail: a sessão do link já chegou (pelo /auth/callback); aqui a pessoa escolhe a nova senha. */
export default function NovaSenha() {
  const tx = useTranslations("app.auth.nova_senha.page");
  const router = useRouter();
  const [state, setState] = useState<"loading" | "form" | "nosession">("loading");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void getBrowserSupabase()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) {
          setEmail(data.user.email ?? "");
          setState("form");
        } else setState("nosession");
      });
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const problem = passwordProblem(pw, { email });
    if (problem) return setMsg(problem);
    if (pw !== pw2) return setMsg("As senhas não são iguais.");
    setBusy(true);
    const sb = getBrowserSupabase();
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) {
      setBusy(false);
      return setMsg(error.message.toLowerCase().includes("same") ? "Escolha uma senha diferente da atual." : "Não foi possível trocar a senha agora. Peça um novo link e tente de novo.");
    }
    router.replace(await homeRouteFor(sb));
  }

  if (state === "loading")
    return (
      <AuthShell>
        <Spinner />
      </AuthShell>
    );
  if (state === "nosession")
    return (
      <AuthShell>
        <div role="alert">
          <h1 className="font-title text-2xl font-semibold">{tx("linkExpirado")}</h1>
          <p className="mt-3 text-[#4a3826]">{tx("esteLinkJaFoiUsado")}</p>
          <Link href="/entrar" className={`${ghostButton} mt-6`}>
            {tx("irParaOLogin")}</Link>
        </div>
      </AuthShell>
    );
  return (
    <AuthShell>
      <form onSubmit={save} noValidate className="space-y-3 text-left">
        <h1 className="font-title text-2xl font-semibold">{tx("novaSenha")}</h1>
        <Field label={tx("novaSenha")}>
          {(id) => (
            <div className="relative">
              <input id={id} type={show ? "text" : "password"} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={`${inputClass} pr-20`} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className="absolute inset-y-0 right-3 cursor-pointer text-sm font-semibold text-[#6b5440] hover:text-[#2f2218]">
                {show ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          )}
        </Field>
        <PasswordHints password={pw} email={email} username="" />
        <Field label={tx("repitaANovaSenha")}>{(id) => <input id={id} type={show ? "text" : "password"} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputClass} />}</Field>
        {msg && (
          <p role="alert" className="text-sm text-[#a23b2a]">
            {msg}
          </p>
        )}
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>
    </AuthShell>
  );
}
