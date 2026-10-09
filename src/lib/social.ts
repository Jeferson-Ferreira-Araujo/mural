import type { SupabaseClient } from "@supabase/supabase-js";

export type PersonLite = { nickname: string; avatar: string | null; plus?: boolean };

/** Quem visitou os seus murais (só quem tem conta, sem datas) e quantos seguidores você tem. */
export async function listVisitors(sb: SupabaseClient): Promise<{ hidden: boolean; visitors: PersonLite[]; followers: number } | null> {
  const { data, error } = await sb.rpc("list_visitors");
  return error || !data ? null : (data as { hidden: boolean; visitors: PersonLite[]; followers: number });
}

export type ProfileSummary = { nickname: string; avatar: string | null; plus: boolean; followers: number | null; views: number; /** pins que a pessoa já colocou nos murais dos outros */ placed: number; self: boolean | null };

export async function getProfileSummary(sb: SupabaseClient, nick: string): Promise<ProfileSummary | null> {
  const { data, error } = await sb.rpc("get_profile_summary", { p_nick: nick });
  return error || !data ? null : (data as ProfileSummary);
}

export type ProfileReportReason = "ofensa" | "assedio" | "sexual" | "falso" | "spam" | "outro";

export async function reportProfile(sb: SupabaseClient, nick: string, reason: ProfileReportReason, details: string): Promise<boolean> {
  const { error } = await sb.rpc("report_profile", { p_nick: nick, p_reason: reason, p_details: details || null });
  return !error;
}

/** Seguidores da pessoa dona do mural aberto (quem desligou "Aparecer como visitante" não entra na lista). */
export async function listFollowers(sb: SupabaseClient, nick: string): Promise<PersonLite[] | null> {
  const { data, error } = await sb.rpc("list_followers", { p_nick: nick });
  return error || !Array.isArray(data) ? null : (data as PersonLite[]);
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

/** "Aparecer como visitante" (como o visto por último do WhatsApp): desligado, a pessoa some das listas dos outros e não vê a lista de quem visitou os murais dela. */
export async function getVisitPrivacy(sb: SupabaseClient): Promise<boolean> {
  const { data, error } = await sb.rpc("get_visit_privacy");
  return error ? true : data !== false;
}

export async function setVisitPrivacy(sb: SupabaseClient, show: boolean): Promise<boolean> {
  const { error } = await sb.rpc("set_visit_privacy", { p_show: show });
  return !error;
}

/** Privacidade do PERFIL: público ou privado (com pergunta e resposta de segurança), valendo para todos os murais. */
export type ProfilePrivacy = { private: boolean; question: string; answer: string };

export async function getProfilePrivacy(sb: SupabaseClient): Promise<ProfilePrivacy | null> {
  const { data, error } = await sb.rpc("get_profile_privacy");
  return error || !data ? null : (data as ProfilePrivacy);
}

/** answer = null mantém a resposta atual (só vale se já existir uma). */
export async function saveProfilePrivacy(sb: SupabaseClient, priv: boolean, question: string, answer: string | null): Promise<boolean> {
  const { error } = await sb.rpc("set_profile_privacy", { p_private: priv, p_question: question, p_answer: answer });
  return !error;
}
