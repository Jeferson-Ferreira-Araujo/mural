"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { homeRouteFor, takeNext } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { AuthShell, ghostButton, Spinner } from "@/components/ui";
import { useTranslations } from "next-intl";

/** Conclui o login (link mágico ou Google): troca o `code` da URL por uma sessão. */
export default function AuthCallback() {
  const tx = useTranslations("app.auth.callback.page");
  const router = useRouter();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const sb = getBrowserSupabase();
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (params.get("error") || !code) {
        // sessão pode já existir (ex.: página recarregada)
        const { data } = await sb.auth.getSession();
        if (!data.session) {
          setError(tx("m_oLinkExpirouOuJa"));
          return;
        }
      } else {
        const { error: err } = await sb.auth.exchangeCodeForSession(code);
        if (err) {
          // o próprio cliente pode já ter trocado o código (login com Google): se a sessão existe, o login deu certo
          const { data } = await sb.auth.getSession();
          if (data.session) {
            router.replace(takeNext() ?? (await homeRouteFor(sb)));
            return;
          }
          setError(tx("m_naoFoiPossivelConcluirO"));
          return;
        }
      }
      router.replace(takeNext() ?? (await homeRouteFor(sb)));
    })();
  }, [router]);

  return (
    <AuthShell>
      {error ? (
        <div role="alert">
          <h1 className="font-title text-2xl font-semibold">{tx("ops")}</h1>
          <p className="mt-3 text-[#4a3826]">{error}</p>
          <Link href="/entrar" className={`${ghostButton} mt-6`}>
            {tx("voltarParaOLogin")}</Link>
        </div>
      ) : (
        <Spinner label={tx("entrando")} />
      )}
    </AuthShell>
  );
}
