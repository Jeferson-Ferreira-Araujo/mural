import type { SupabaseClient } from "@supabase/supabase-js";

/** Resultado da conferência feita ao enviar o cadastro: nome comum, nome reservado com e-mail da marca (confirmar por código) ou não permitido. */
export type SignupCheck = "ok" | "verify" | "denied";

export const NAME_DENIED_TEXT = "Esse nome de usuário não pode ser utilizado.";

export async function checkSignup(sb: SupabaseClient, nick: string, email: string): Promise<SignupCheck> {
  const { data, error } = await sb.rpc("check_signup", { p_nick: nick, p_email: email });
  // se a conferência falhar, trata como "não permitido" só para nomes que o servidor reconheceria; aqui, por segurança, nega
  if (error) return "denied";
  return data === "verify" ? "verify" : data === "denied" ? "denied" : "ok";
}

/** Envia o código de confirmação para o e-mail (cria a conta sem acesso: só entra quem confirmar). */
export async function sendEmailCode(sb: SupabaseClient, email: string, nick: string): Promise<boolean> {
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: { nickname: nick } } });
  return !error;
}

export type ConfirmFailure = "wrong_code" | "no_claim" | "not_allowed" | "password" | "error";

/**
 * Confere o código; se estiver certo, a conta recebe o nome reservado e a senha escolhida.
 * A senha só é definida DEPOIS de o servidor aprovar o nome (conta que já existia não tem a senha trocada).
 */
export async function confirmEmailCode(sb: SupabaseClient, email: string, code: string, password: string): Promise<{ ok: true; nickname: string } | { ok: false; reason: ConfirmFailure }> {
  setFinalizing(true); // enquanto confirma, o site não manda a pessoa para o mural no meio do processo
  const { error: vErr } = await sb.auth.verifyOtp({ email, token: code.trim(), type: "email" });
  if (vErr) return { ok: false, reason: /expired|invalid|token/i.test(vErr.message) ? "wrong_code" : "error" };
  const { data, error: fErr } = await sb.rpc("finalize_reserved_nickname");
  if (fErr || typeof data !== "string") {
    await sb.auth.signOut();
    return { ok: false, reason: /nothing_pending/.test(fErr?.message ?? "") ? "no_claim" : /domain_mismatch|email_not_verified|nickname_taken/.test(fErr?.message ?? "") ? "not_allowed" : "error" };
  }
  const { error: pErr } = await sb.auth.updateUser({ password });
  if (pErr) return { ok: false, reason: "password" };
  return { ok: true, nickname: data };
}

// ---- durante a confirmação o site não pode redirecionar sozinho (a conta ainda não tem nome nem senha) ----
const FLAG = "pinz:finalizing";
export function setFinalizing(on: boolean) {
  try {
    if (on) sessionStorage.setItem(FLAG, "1");
    else sessionStorage.removeItem(FLAG);
  } catch {}
}
export function isFinalizing(): boolean {
  try {
    return sessionStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}
