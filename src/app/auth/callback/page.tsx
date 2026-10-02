"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { homeRouteFor } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { AuthShell, ghostButton, Spinner } from "@/components/ui";

/** Conclui o login (link mágico ou Google): troca o `code` da URL por uma sessão. */
export default function AuthCallback() {
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
          setError("O link expirou ou já foi usado. Peça um novo.");
          return;
        }
      } else {
        const { error: err } = await sb.auth.exchangeCodeForSession(code);
        if (err) {
          setError("Não foi possível concluir o login. Abra o link no mesmo navegador em que você o pediu, ou peça um novo.");
          return;
        }
      }
      router.replace(await homeRouteFor(sb));
    })();
  }, [router]);

  return (
    <AuthShell>
      {error ? (
        <div role="alert">
          <h1 className="font-title text-2xl font-semibold">Ops!</h1>
          <p className="mt-3 text-[#4a3826]">{error}</p>
          <Link href="/entrar" className={`${ghostButton} mt-6`}>
            Voltar para o login
          </Link>
        </div>
      ) : (
        <Spinner label="Entrando…" />
      )}
    </AuthShell>
  );
}
