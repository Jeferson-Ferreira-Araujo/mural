"use client";

import { useEffect, useState } from "react";
import { callbackUrl } from "@/lib/auth";
import { OAUTH_LABEL, OAUTH_PROVIDERS, type OAuthProvider } from "@/lib/oauth";
import { getBrowserSupabase } from "@/lib/supabase";
import { ghostButton } from "./ui";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

/** Botões "Continuar com…" (só os provedores ligados). `onError` recebe o texto do erro, se houver. */
export function OAuthButtons({ onError, className = "" }: { onError: (msg: string | null) => void; className?: string }) {
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  // voltou do Google pelo botão "voltar": o navegador restaura a página com o botão preso em "Abrindo…"
  useEffect(() => {
    const reset = () => setBusy(null);
    const onShow = (e: PageTransitionEvent) => e.persisted && reset();
    window.addEventListener("pageshow", onShow);
    const onVisible = () => document.visibilityState === "visible" && reset();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  if (OAUTH_PROVIDERS.length === 0) return null;

  async function go(provider: OAuthProvider) {
    onError(null);
    setBusy(provider);
    const { error } = await getBrowserSupabase().auth.signInWithOAuth({ provider, options: { redirectTo: callbackUrl() } });
    if (error) {
      setBusy(null);
      onError(`Não foi possível entrar com ${OAUTH_LABEL[provider].replace("Continuar com ", "")}.`);
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {OAUTH_PROVIDERS.map((p) => (
        <button key={p} type="button" disabled={busy !== null} onClick={() => void go(p)} className={`${ghostButton} flex w-full items-center justify-center gap-2.5 bg-white/70 disabled:opacity-60`}>
          {p === "google" && <GoogleLogo />}
          {busy === p ? "Abrindo…" : OAUTH_LABEL[p]}
        </button>
      ))}
      <p className="pt-1 text-center text-sm text-[#6b5440]">ou</p>
    </div>
  );
}
