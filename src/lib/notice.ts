import type { SupabaseClient } from "@supabase/supabase-js";

/** t = título, b = texto, c = nome do botão do link (opcional). */
export type NoticeTexts = Record<string, { t: string; b: string; c?: string }>;
export type SiteNotice = { id: string; rev: number; texts: NoticeTexts; image?: string | null; link?: string | null };

export async function fetchNotice(sb: SupabaseClient): Promise<SiteNotice | null> {
  const { data, error } = await sb.rpc("get_site_notice");
  return error || !data || typeof data !== "object" || !("id" in data) ? null : (data as SiteNotice);
}

/** Texto no idioma da pessoa; sem tradução, cai para o português. */
export function noticeText(texts: NoticeTexts, locale: string) {
  const own = texts[locale];
  return own?.t && own?.b ? own : texts.pt;
}
