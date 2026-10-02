import type { SupabaseClient } from "@supabase/supabase-js";

export type MuralStats = { visited: number; tried: number; correct: number; messages: number };

export type PublicMural = {
  slug: string;
  owner_name: string;
  title_prefix: "do" | "da" | "de";
  tagline: string;
  question: string;
  stats: MuralStats;
};

export type UnlockResult =
  | { ok: true; token?: string }
  | { ok: false; reason: "wrong" | "rate_limited" | "error"; retryAfter?: number };

export async function getPublicMural(sb: SupabaseClient, slug: string): Promise<PublicMural | null> {
  const { data, error } = await sb.rpc("get_public_mural", { p_slug: slug });
  if (error || !data) return null;
  return data as PublicMural;
}

export async function slugAvailable(sb: SupabaseClient, slug: string): Promise<boolean> {
  const { data, error } = await sb.rpc("slug_available", { p_slug: slug });
  return !error && data === true;
}

export async function tryUnlock(sb: SupabaseClient, slug: string, answer: string, visitorId: string): Promise<UnlockResult> {
  const { data, error } = await sb.rpc("try_unlock", { p_slug: slug, p_answer: answer, p_visitor_id: visitorId });
  if (error || !data) return { ok: false, reason: "error" };
  if (data.ok) return { ok: true, token: data.token };
  if (data.reason === "rate_limited") return { ok: false, reason: "rate_limited", retryAfter: data.retry_after };
  return { ok: false, reason: data.reason === "wrong" ? "wrong" : "error" };
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

const grantKey = (slug: string) => `mural:grant:${slug}`;
export const loadGrant = (slug: string) => {
  try {
    return localStorage.getItem(grantKey(slug));
  } catch {
    return null;
  }
};
export const saveGrant = (slug: string, token: string) => {
  try {
    localStorage.setItem(grantKey(slug), token);
  } catch {
    /* sem armazenamento: o desbloqueio vale só nesta visita */
  }
};
export const clearGrant = (slug: string) => {
  try {
    localStorage.removeItem(grantKey(slug));
  } catch {
    /* ignore */
  }
};

/** Transforma um nome em endereço: "Jeferson Araújo" -> "jeferson-araujo". */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
}

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export const SITE_HOST = "mural.jefersonaraujo.com.br";

export async function checkGrantClient(sb: SupabaseClient, slug: string, token: string): Promise<boolean> {
  const { data, error } = await sb.rpc("check_grant", { p_slug: slug, p_token: token });
  return !error && data === true;
}
