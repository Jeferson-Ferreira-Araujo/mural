import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabase } from "./supabase";

/** Evento global: um crédito de recompensa entrou (detail: { title, credits }). A tela mostra o aviso e atualiza o saldo. */
export const REWARD_EVENT = "pinz:reward";

/** Evento: abre a janela "Ganhe créditos" (botão da barra de bottons). */
export const OPEN_REWARDS_EVENT = "pinz:open-rewards";

export type RewardTask = { id: string; title: string; hint: string; credits: number; done: boolean; ready: boolean };
export type RewardId = "avatar" | "share_mural" | "share_pin" | "pin_other" | "follow";

/** Resgata a recompensa de uma tarefa na hora. Só vale uma vez por conta; o servidor confere o que dá para conferir. Devolve o ganho, ou null se não houve. */
export async function claimReward(task: RewardId, sb: SupabaseClient = getBrowserSupabase()): Promise<{ title: string; credits: number } | null> {
  try {
    const { data, error } = await sb.rpc("claim_reward", { p_task: task });
    const d = data as { ok?: boolean; granted?: number; title?: string } | null;
    if (error || !d?.ok || !d.granted) return null;
    const res = { title: d.title ?? "", credits: d.granted };
    window.dispatchEvent(new CustomEvent(REWARD_EVENT, { detail: res }));
    return res;
  } catch {
    return null;
  }
}

/** As tarefas e o que já foi ganho. `ready`: já está cumprida e ainda não foi resgatada (acontece com quem fez antes do sistema existir). */
export async function getRewards(sb: SupabaseClient = getBrowserSupabase()): Promise<RewardTask[] | null> {
  const { data, error } = await sb.rpc("get_rewards");
  return error || !Array.isArray(data) ? null : (data as RewardTask[]);
}

let refPromise: Promise<string | null> | null = null;
/** Código da conta nos links que ela compartilha (só quem está logado tem; guardado depois da primeira busca). */
export function getRefCode(sb: SupabaseClient = getBrowserSupabase()): Promise<string | null> {
  if (!refPromise) {
    refPromise = Promise.resolve(sb.rpc("get_my_ref")).then(({ data, error }) => {
      if (error || typeof data !== "string") refPromise = null; // deslogado ou falhou: tenta de novo na próxima
      return error || typeof data !== "string" ? null : data;
    });
  }
  return refPromise;
}

/** Põe o código da conta num link para a recompensa valer quando outra pessoa o abrir (t: m = mural, p = pin). Sem código, devolve o link como está. */
export async function withRef(url: string, t: "m" | "p"): Promise<string> {
  const code = await getRefCode();
  if (!code) return url;
  const u = new URL(url);
  u.searchParams.set("ref", code);
  u.searchParams.set("t", t);
  return u.toString();
}

const REF_KEY = "pinz:ref";

/** Quem chega por um link compartilhado (?ref=…&t=…) tem o código guardado no aparelho: se criar uma conta, a recompensa vai para quem compartilhou. */
export function rememberRef(): void {
  try {
    const q = new URLSearchParams(window.location.search);
    const code = q.get("ref");
    const t = q.get("t");
    if (code && /^[0-9a-f]{8}$/.test(code) && (t === "m" || t === "p")) localStorage.setItem(REF_KEY, JSON.stringify({ code, t }));
  } catch {
    /* sem armazenamento: não guarda */
  }
}

/** Conta nova que veio por um link: o servidor confere (conta criada há pouco, ainda sem indicação, não é o próprio dono) e paga a quem compartilhou. O código guardado é usado uma vez. */
export async function claimStoredReferral(sb: SupabaseClient = getBrowserSupabase()): Promise<void> {
  try {
    const raw = localStorage.getItem(REF_KEY);
    if (!raw) return;
    localStorage.removeItem(REF_KEY);
    const { code, t } = JSON.parse(raw) as { code: string; t: "m" | "p" };
    await sb.rpc("claim_referral", { p_code: code, p_task: t === "m" ? "share_mural" : "share_pin" });
  } catch {
    /* sem rede ou sem armazenamento: não faz nada */
  }
}
