"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { callbackUrl, getOwnMural, useSession } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { AuthShell, Field, inputClass, primaryButton, Spinner, ghostButton } from "@/components/ui";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

export default function Entrar() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // já logado: vai para o painel (ou para a criação do mural)
  useEffect(() => {
    if (!session) return;
    getOwnMural(getBrowserSupabase()).then((m) => router.replace(m ? "/painel" : "/criar"));
  }, [session, router]);

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(v)) {
      setError("Digite um e-mail válido.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await getBrowserSupabase().auth.signInWithOtp({
      email: v,
      options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
    });
    setBusy(false);
    if (err) setError(err.status === 429 ? "Muitos pedidos. Aguarde um pouco e tente de novo." : "Não foi possível enviar o link. Tente de novo.");
    else setSent(true);
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

  return (
    <AuthShell>
      {sent ? (
        <div role="status">
          <h1 className="font-title text-2xl font-semibold">Confira seu e-mail ✉️</h1>
          <p className="mt-3 text-[#4a3826]">
            Enviamos um link de acesso para <strong>{email.trim()}</strong>. Abra-o <strong>neste mesmo navegador</strong> para entrar.
          </p>
          <button type="button" onClick={() => setSent(false)} className={`${ghostButton} mt-6`}>
            Usar outro e-mail
          </button>
        </div>
      ) : (
        <>
          <h1 className="font-title text-2xl font-semibold">Crie o seu mural</h1>
          <p className="mt-2 text-[#4a3826]">Entre para criar o seu mural e compartilhar com quem realmente te conhece.</p>

          {GOOGLE_ENABLED && (
            <>
              <button type="button" onClick={google} className={`${ghostButton} mt-6 w-full bg-white/70`}>
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                  <path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.6a4.8 4.8 0 0 1-2.1 3.1v2.6h3.4c2-1.8 3.1-4.5 3.1-7.5Z" />
                  <path fill="#34A853" d="M12 22c2.8 0 5.2-.9 6.9-2.5l-3.4-2.6c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.7v2.7A10 10 0 0 0 12 22Z" />
                  <path fill="#FBBC05" d="M6.2 13.6a6 6 0 0 1 0-3.8V7.1H2.7a10 10 0 0 0 0 9.2l3.5-2.7Z" />
                  <path fill="#EA4335" d="M12 6c1.5 0 2.9.5 4 1.6l3-3A10 10 0 0 0 2.7 7.1l3.5 2.7C7 7.8 9.300 6 12 6Z" />
                </svg>
                Continuar com o Google
              </button>
              <p className="my-4 text-center text-sm text-[#6b5440]">ou</p>
            </>
          )}

          <form onSubmit={sendLink} noValidate className={GOOGLE_ENABLED ? "" : "mt-6"}>
            <Field label="Seu e-mail" error={error} hint="Enviamos um link de acesso, sem senha.">
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
            <button type="submit" disabled={busy} className={`${primaryButton} mt-4`}>
              {busy ? "Enviando…" : "Receber link de acesso"}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
