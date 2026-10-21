"use client";

import { useEffect } from "react";
import { Spinner } from "@/components/ui";
import { afterSignOutUrl } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";

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
        go();
      });
  }, []);
  return (
    <main className="grid min-h-dvh place-items-center bg-[#2a1a0e]">
      <Spinner />
    </main>
  );
}
