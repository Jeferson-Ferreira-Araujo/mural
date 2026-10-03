import type { SupabaseClient } from "@supabase/supabase-js";

/** Números do site inteiro (tela inicial). */
export type SiteStats = { murals: number; cards: number; people: number; unlocks: number };

export async function getSiteStats(sb: SupabaseClient): Promise<SiteStats | null> {
  const { data, error } = await sb.rpc("site_stats");
  if (error || !data) return null;
  const d = data as Partial<SiteStats>;
  return { murals: Number(d.murals) || 0, cards: Number(d.cards) || 0, people: Number(d.people) || 0, unlocks: Number(d.unlocks) || 0 };
}

export type MuralStats = { visited: number; tried: number; correct: number; messages: number };

/** Identifica um mural: o nickname da pessoa + o endereço do mural dentro dele. */
export type MuralRef = { nick: string; slug: string };

export type PublicMural = {
  nickname: string;
  /** Foto de perfil do dono (endereço público), se ele enviou. */
  avatar?: string | null;
  slug: string;
  title: string;
  question: string;
  /** Fundo escolhido pelo dono (padrão: cortiça). */
  board?: string;
  /** Plano do mural: define o limite de pins e os formatos (validado no servidor). */
  plan?: "free" | "full";
  /** Mensagem do mural vazio, personalizada pelo dono (só chega se o mural é FULL). */
  welcome?: string | null;
  stats: MuralStats;
};

export type ProfileMurals = {
  nickname: string;
  avatar?: string | null;
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

/**
 * O desbloqueio fica só na ABA (sessionStorage): fechar a aba ou o navegador tranca o mural de novo.
 * No servidor ele também vence sozinho (2 horas) e é apagado quando o dono troca a pergunta ou a resposta.
 */
const grantKey = (r: MuralRef) => `mural:grant:${r.nick}/${r.slug}`;

/** Desbloqueios antigos eram guardados no navegador por 30 dias: apaga todos (uma vez por carregamento). */
let legacyCleaned = false;
function cleanLegacyGrants() {
  if (legacyCleaned) return;
  legacyCleaned = true;
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("mural:grant:"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* sem armazenamento */
  }
}

export const loadGrant = (r: MuralRef) => {
  cleanLegacyGrants();
  try {
    return sessionStorage.getItem(grantKey(r));
  } catch {
    return null;
  }
};
export const saveGrant = (r: MuralRef, token: string) => {
  try {
    sessionStorage.setItem(grantKey(r), token);
  } catch {
    /* sem armazenamento: o desbloqueio vale só enquanto a página estiver aberta */
  }
};
export const clearGrant = (r: MuralRef) => {
  try {
    sessionStorage.removeItem(grantKey(r));
  } catch {
    /* nada a apagar */
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

export type ProfileHit = { nickname: string; murals: number; avatar?: string | null };

/** Busca pessoas pelo nickname (só quem tem mural). */
export async function searchProfiles(sb: SupabaseClient, query: string): Promise<ProfileHit[]> {
  const { data, error } = await sb.rpc("search_profiles", { p_query: query });
  if (error || !Array.isArray(data)) return [];
  return data as ProfileHit[];
}
