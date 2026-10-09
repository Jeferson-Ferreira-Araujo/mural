import type { SupabaseClient } from "@supabase/supabase-js";

export type PersonLite = { nickname: string; avatar: string | null; plus?: boolean };

/** Quem visitou os seus murais (só quem tem conta, sem datas) e quantos seguidores você tem. */
export async function listVisitors(sb: SupabaseClient): Promise<{ visitors: PersonLite[]; followers: number } | null> {
  const { data, error } = await sb.rpc("list_visitors");
  return error || !data ? null : (data as { visitors: PersonLite[]; followers: number });
}

export async function listFollowing(sb: SupabaseClient): Promise<PersonLite[] | null> {
  const { data, error } = await sb.rpc("list_following");
  return error || !Array.isArray(data) ? null : (data as PersonLite[]);
}

export async function isFollowing(sb: SupabaseClient, nick: string): Promise<boolean> {
  const { data, error } = await sb.rpc("is_following", { p_nick: nick });
  return !error && data === true;
}

export async function setFollowing(sb: SupabaseClient, nick: string, follow: boolean): Promise<boolean> {
  const { error } = await sb.rpc(follow ? "follow_user" : "unfollow_user", { p_nick: nick });
  return !error;
}
