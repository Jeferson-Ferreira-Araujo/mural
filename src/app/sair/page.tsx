"use client";

import { useEffect } from "react";
import { Spinner } from "@/components/ui";
import { afterSignOutUrl } from "@/lib/auth";
import { clearLocalSession, getBrowserSupabase } from "@/lib/supabase";

/**
 * Sair da conta: a pessoa vem para esta página (navegação imediata, sem depender do mural em que estava); aqui a sessão é encerrada
 * e ela é levada ao login (celular) ou à tela inicial (desktop). Se a rede demorar, sai do mesmo jeito.
 */
export default function Sair() {
  useEffect(() => {
    const go = () => window.location.replace(afterSignOutUrl());
    const t = window.setTimeout(go, 3000);
    void getBrowserSupabase()
      .auth.signOut()
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(t);
        clearLocalSession(); // se o servidor não reconheceu a sessão (conta excluída), o login some do aparelho do mesmo jeito
        go();
      });
  }, []);
  return (
    <main className="grid min-h-dvh place-items-center bg-[#2a1a0e]">
      <Spinner />
    </main>
  );
}
