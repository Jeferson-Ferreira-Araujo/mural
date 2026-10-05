import type { SupabaseClient } from "@supabase/supabase-js";
import type { MuralRef, UnlockResult } from "./mural";
import type { BoardItem } from "./types";

/** Mural compartilhado entre duas pessoas PLUS (entra por senha + conta de um dos participantes). */
export type SharedMural = {
  id: string;
  slug: string;
  title: string;
  /** nickname de quem criou (o endereço do mural é /{owner}/{slug}) */
  owner: string;
  partner: string;
  /** pending = convite ainda não aceito */
  status: "pending" | "accepted";
  /** true = fui eu quem criou */
  mine: boolean;
  /** uma das duas pessoas perdeu o PLUS: o mural fica bloqueado para as duas */
  locked?: boolean;
};

export async function listSharedMurals(sb: SupabaseClient): Promise<SharedMural[]> {
  const { data, error } = await sb.rpc("list_shared_murals");
  if (error || !Array.isArray(data)) return [];
  return data as SharedMural[];
}

export type SharedFailure = "plus_required" | "partner_not_found" | "partner_self" | "shared_limit" | "invite_exists" | "password_invalid" | "invalid_title" | "error";

const KNOWN: SharedFailure[] = ["plus_required", "partner_not_found", "partner_self", "shared_limit", "invite_exists", "password_invalid", "invalid_title"];
const failure = (message: string): SharedFailure => KNOWN.find((k) => message.includes(k)) ?? "error";

export const SHARED_ERROR_TEXT: Record<SharedFailure, string> = {
  plus_required: "O mural compartilhado é do PINZ PLUS, e as duas pessoas precisam ter o plano.",
  partner_not_found: "Não encontramos ninguém com esse nome de usuário.",
  partner_self: "Escolha outra pessoa: você não pode compartilhar o mural com você mesmo.",
  shared_limit: "Você já criou o máximo de 3 murais compartilhados.",
  invite_exists: "Já existe um convite seu aguardando essa pessoa.",
  password_invalid: "A senha precisa ter de 6 a 72 caracteres.",
  invalid_title: "Escreva um nome para o mural (até 60 letras).",
  error: "Não foi possível concluir agora. Tente de novo.",
};

export async function createSharedMural(sb: SupabaseClient, title: string, partner: string, password: string): Promise<{ ok: true; slug: string; nickname: string } | { ok: false; reason: SharedFailure }> {
  const { data, error } = await sb.rpc("create_shared_mural", { p_title: title, p_partner: partner, p_password: password });
  if (error || !data) return { ok: false, reason: failure(error?.message ?? "") };
  return { ok: true, slug: data.slug, nickname: data.nickname };
}

export async function respondSharedInvite(sb: SupabaseClient, id: string, accept: boolean): Promise<{ ok: true } | { ok: false; reason: SharedFailure }> {
  const { error } = await sb.rpc("respond_shared_invite", { p_id: id, p_accept: accept });
  return error ? { ok: false, reason: failure(error.message) } : { ok: true };
}

export async function setSharedPassword(sb: SupabaseClient, id: string, password: string): Promise<{ ok: true } | { ok: false; reason: SharedFailure }> {
  const { error } = await sb.rpc("set_shared_password", { p_id: id, p_password: password });
  return error ? { ok: false, reason: failure(error.message) } : { ok: true };
}

/** Cancela o convite ou apaga o mural (só quem criou). */
export async function deleteSharedMural(sb: SupabaseClient, id: string): Promise<boolean> {
  const { error } = await sb.rpc("delete_mural", { p_id: id });
  return !error;
}

/** Como o mural compartilhado está montado (espaços, tipos e estilos, SEM conteúdo): só para os participantes, antes de digitar a senha. */
export async function fetchSharedLayout(sb: SupabaseClient, ref: MuralRef): Promise<BoardItem[]> {
  const { data, error } = await sb.rpc("get_shared_layout", { p_nick: ref.nick, p_slug: ref.slug });
  return error || !Array.isArray(data) ? [] : (data as BoardItem[]);
}

/** Abre o mural compartilhado: o servidor confere a conta (participante), a senha e limita as tentativas. */
export async function unlockShared(sb: SupabaseClient, ref: MuralRef, password: string, visitorId: string): Promise<UnlockResult> {
  const { data, error } = await sb.rpc("unlock_shared", { p_nick: ref.nick, p_slug: ref.slug, p_password: password, p_visitor_id: visitorId });
  if (error || !data) return { ok: false, reason: "error" };
  if (data.ok) return { ok: true, token: data.token };
  if (data.reason === "rate_limited") return { ok: false, reason: "rate_limited", retryAfter: data.retry_after };
  if (data.reason === "plus_required") return { ok: false, reason: "plus_required" };
  return { ok: false, reason: data.reason === "wrong" ? "wrong" : "error" };
}
