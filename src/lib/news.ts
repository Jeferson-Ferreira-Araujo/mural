import type { SupabaseClient } from "@supabase/supabase-js";

/** Idiomas do site (o português é o texto de origem). */
export const NEWS_LOCALES = ["pt", "en", "es", "fr", "it", "de", "nl", "pl", "uk", "ru", "tr", "ar", "hi", "id", "vi", "th", "ko", "ja", "zh"] as const;

export type NewsTexts = Record<string, { t: string; b: string }>;
export type NewsItem = { id: string; createdAt: string; texts: NewsTexts };

export async function fetchNews(sb: SupabaseClient): Promise<NewsItem[]> {
  const { data, error } = await sb.rpc("list_news");
  return error || !Array.isArray(data) ? [] : (data as NewsItem[]);
}

/** Texto no idioma da pessoa; se ainda não houver tradução, cai para o português (nunca fica vazio). */
export function newsText(texts: NewsTexts, locale: string): { t: string; b: string } {
  const own = texts[locale];
  return own?.t && own?.b ? own : texts.pt;
}
