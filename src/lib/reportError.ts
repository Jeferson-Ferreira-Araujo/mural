"use client";

import { getBrowserSupabase } from "@/lib/supabase";

let sent = 0;

/** ruído que não é do nosso código: extensões, rolagem, aviso sem pilha */
const IGNORE = /ResizeObserver loop|Script error|Non-Error promise rejection|extension:\/\/|AbortError|The operation was aborted|Load failed|Failed to fetch|NetworkError|cancelled/i;

/**
 * Anota o erro no banco (mensagem, trecho da pilha e caminho sem query string; nenhum dado da pessoa).
 * Nunca lança nem atrapalha a tela: no máximo 6 por página aberta.
 */
export function reportError(area: string, err: unknown) {
  try {
    if (sent >= 6) return;
    const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err)?.slice(0, 300) ?? "erro");
    if (IGNORE.test(e.message) || IGNORE.test(e.stack ?? "")) return;
    sent += 1;
    void getBrowserSupabase()
      .rpc("log_app_error", { p_source: "client", p_area: area, p_message: e.message, p_stack: e.stack ?? null, p_path: location.pathname })
      .then(() => undefined);
  } catch {}
}
