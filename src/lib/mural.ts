import type { SupabaseClient } from "@supabase/supabase-js";

export type MuralStats = { visited: number; tried: number; correct: number; messages: number };

/** Identifica um mural: o nickname da pessoa + o endereço do mural dentro dele. */
export type MuralRef = { nick: string; slug: string };

export type PublicMural = {
  nickname: string;
  slug: string;
  title: string;
  question: string;
  stats: MuralStats;
};

export type ProfileMurals = {
  nickname: string;
  murals: { slug: string; title: string }[];
};

export type UnlockResult =
  | { ok: true; token?: string }
  | { ok: false; reason: "wrong" | "rate_limited" | "error"; retryAfter?: number };

export const SITE_HOST = "mural.jefersonaraujo.com.br";
export const muralPath = (r: MuralRef) => `/${r.nick}/${r.slug}`;
export const muralUrl = (r: MuralRef) => `${SITE_HOST}${muralPath(r)}`;

export async function getPublicMural(sb: SupabaseClient, ref: MuralRef): Promise<PublicMural | null> {
  const { data, error } = await sb.rpc("get_public_mural", { p_nick: ref.nick, p_slug: ref.slug });
  if (error || !data) return null;
  return data as PublicMural;
}

export async function getProfileMurals(sb: SupabaseClient, nick: string): Promise<ProfileMurals | null> {
  const { data, error } = await sb.rpc("get_profile_murals", { p_nick: nick });
  if (error || !data) return null;
  return data as ProfileMurals;
}

export async function nicknameAvailable(sb: SupabaseClient, nick: string): Promise<boolean> {
  const { data, error } = await sb.rpc("nickname_available", { p_nick: nick });
  return !error && data === true;
}

export async function tryUnlock(sb: SupabaseClient, ref: MuralRef, answer: string, visitorId: string): Promise<UnlockResult> {
  const { data, error } = await sb.rpc("try_unlock", { p_nick: ref.nick, p_slug: ref.slug, p_answer: answer, p_visitor_id: visitorId });
  if (error || !data) return { ok: false, reason: "error" };
  if (data.ok) return { ok: true, token: data.token };
  if (data.reason === "rate_limited") return { ok: false, reason: "rate_limited", retryAfter: data.retry_after };
  return { ok: false, reason: data.reason === "wrong" ? "wrong" : "error" };
}

export async function checkGrantClient(sb: SupabaseClient, ref: MuralRef, token: string): Promise<boolean> {
  const { data, error } = await sb.rpc("check_grant", { p_nick: ref.nick, p_slug: ref.slug, p_token: token });
  return !error && data === true;
}

/** Identificador anônimo do visitante (só neste navegador). Não identifica pessoa. */
export function getVisitorId(): string {
  try {
    let id = localStorage.getItem("mural:visitor");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("mural:visitor", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

const grantKey = (r: MuralRef) => `mural:grant:${r.nick}/${r.slug}`;
export const loadGrant = (r: MuralRef) => {
  try {
    return localStorage.getItem(grantKey(r));
  } catch {
    return null;
  }
};
export const saveGrant = (r: MuralRef, token: string) => {
  try {
    localStorage.setItem(grantKey(r), token);
  } catch {
    /* sem armazenamento: o desbloqueio vale só nesta visita */
  }
};

/** Normaliza o nickname digitado: minúsculas, só letras, números e hífen. */
export function cleanNickname(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 30);
}

export const NICK_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

/** Prévia do endereço do mural a partir do título (o servidor garante a unicidade com -2, -3…). */
export function slugFromTitle(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return base.length >= 2 ? base : "mural";
}

/** Mesma regra do banco: base do título, com -2, -3… se a pessoa já tiver um mural com esse endereço. */
export function uniqueSlug(title: string, existing: string[]): string {
  const base = slugFromTitle(title);
  let cand = base;
  let n = 1;
  while (existing.includes(cand)) {
    n += 1;
    cand = `${base.slice(0, 36)}-${n}`;
  }
  return cand;
}

export type ProfileHit = { nickname: string; murals: number };

/** Busca pessoas pelo nickname (só quem tem mural). */
export async function searchProfiles(sb: SupabaseClient, query: string): Promise<ProfileHit[]> {
  const { data, error } = await sb.rpc("search_profiles", { p_query: query });
  if (error || !Array.isArray(data)) return [];
  return data as ProfileHit[];
}
