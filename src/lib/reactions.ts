import type { SupabaseClient } from "@supabase/supabase-js";

/** Reações fixas (uma por pessoa por pin). A chave vai para o banco; o emoji é só de exibição. */
export const REACTIONS = [
  { key: "heart", emoji: "❤️", label: "Amei" },
  { key: "laugh", emoji: "😂", label: "Engraçado" },
  { key: "wow", emoji: "😮", label: "Uau" },
  { key: "clap", emoji: "👏", label: "Palmas" },
  { key: "fire", emoji: "🔥", label: "Incrível" },
  { key: "sad", emoji: "😢", label: "Emocionante" },
] as const;
export type ReactionKey = (typeof REACTIONS)[number]["key"];
export const reactionEmoji = (key: string) => REACTIONS.find((r) => r.key === key)?.emoji ?? "❤️";

export type ReactionSummary = { counts: Partial<Record<ReactionKey, number>>; mine: ReactionKey | null };

export async function fetchReactions(sb: SupabaseClient, id: string, token: string | null): Promise<ReactionSummary | null> {
  const { data, error } = await sb.rpc("get_message_reactions", { p_id: id, p_token: token });
  return error || !data ? null : (data as ReactionSummary);
}

/** key = null tira a reação. */
export async function reactTo(sb: SupabaseClient, id: string, token: string | null, key: ReactionKey | null): Promise<ReactionSummary | null> {
  const { data, error } = await sb.rpc("react_message", { p_id: id, p_token: token, p_emoji: key });
  return error || !data ? null : (data as ReactionSummary);
}
