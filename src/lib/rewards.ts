import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabase } from "./supabase";

/** Evento global: um crédito de recompensa entrou (detail: { title, credits }). A tela mostra o aviso e atualiza o saldo. */
export const REWARD_EVENT = "pinz:reward";

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
