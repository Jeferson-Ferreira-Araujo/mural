import { adminClient } from "@/lib/mercadopago";

/**
 * Anota um erro do servidor no registro (tabela app_errors), que alimenta o painel /admin/status e os avisos por e-mail.
 * Áreas que começam com "pay" disparam aviso imediato. Nunca lança erro; passe só texto sem dado pessoal.
 */
export async function logServerError(area: string, err: unknown): Promise<void> {
  try {
    const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err)?.slice(0, 300) ?? "erro");
    await adminClient().rpc("log_app_error", { p_source: "server", p_area: area, p_message: e.message, p_stack: e.stack ?? null, p_path: null });
  } catch {}
}
