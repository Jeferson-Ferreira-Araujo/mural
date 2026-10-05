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

// ---- boas-vindas para conta de empresa recém-criada (nome da lista reservada) ----
const WELCOME_KEY = "pinz:company-welcome";
const PRETTY: Record<string, string> = {
  bancodobrasil: "Banco do Brasil", cocacola: "Coca-Cola", mcdonalds: "McDonald's", burgerking: "Burger King", magazineluiza: "Magazine Luiza",
  casasbahia: "Casas Bahia", mercadolivre: "Mercado Livre", mercadopago: "Mercado Pago", ifood: "iFood", openai: "OpenAI", chatgpt: "ChatGPT",
  youtube: "YouTube", tiktok: "TikTok", whatsapp: "WhatsApp", linkedin: "LinkedIn", github: "GitHub", gitlab: "GitLab", picpay: "PicPay",
  ibm: "IBM", bmw: "BMW", sap: "SAP", amd: "AMD", lg: "LG", hm: "H&M", kfc: "KFC", sbt: "SBT", tim: "TIM", nvidia: "NVIDIA", pinz: "Pinz", pinzapp: "Pinz",
  ambev: "Ambev", itau: "Itaú", boticario: "O Boticário", seguranca: "Segurança", moderacao: "Moderação",
};
/** "facebook" → "Facebook", "bancodobrasil" → "Banco do Brasil". */
export const companyDisplayName = (nick: string) => PRETTY[nick] ?? nick.charAt(0).toUpperCase() + nick.slice(1);

/** Guarda que a conta acabou de ser criada com um nome reservado: o mural mostra a mensagem de boas-vindas uma vez. */
export function markCompanyWelcome(nick: string) {
  try {
    localStorage.setItem(WELCOME_KEY, nick);
  } catch {}
}
/** Lê e apaga o aviso: só devolve se for da conta que está logada. */
export function takeCompanyWelcome(myNick: string): boolean {
  try {
    const v = localStorage.getItem(WELCOME_KEY);
    if (v === null) return false;
    if (v !== myNick) return false; // outra conta: deixa guardado
    localStorage.removeItem(WELCOME_KEY);
    return true;
  } catch {
    return false;
  }
}
