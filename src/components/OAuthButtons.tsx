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

function FacebookLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden>
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden>
      <path fill="#111" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09ZM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
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
    <div className={className}>
      <p className="text-center text-sm text-[#6b5440]">Continuar com</p>
      {/* só os ícones, lado a lado (cabem 3 ou mais na mesma linha) */}
      <div className="mt-2 flex items-center justify-center gap-3">
        {OAUTH_PROVIDERS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={busy !== null}
            onClick={() => void go(p)}
            aria-label={OAUTH_LABEL[p]}
            title={OAUTH_LABEL[p]}
            className={`${ghostButton} grid h-12 min-w-0 flex-1 place-items-center bg-white/70 !px-0 disabled:opacity-60 sm:max-w-[6.5rem]`}
          >
            {busy === p ? (
              <span className="text-xs font-semibold">Abrindo…</span>
            ) : p === "google" ? (
              <GoogleLogo />
            ) : p === "facebook" ? (
              <FacebookLogo />
            ) : p === "apple" ? (
              <AppleLogo />
            ) : (
              <span className="text-sm font-bold">{OAUTH_LABEL[p].replace("Continuar com ", "").replace(/^(o|a) /, "")}</span>
            )}
          </button>
        ))}
      </div>
      <p className="pt-3 text-center text-sm text-[#6b5440]">ou</p>
    </div>
  );
}
