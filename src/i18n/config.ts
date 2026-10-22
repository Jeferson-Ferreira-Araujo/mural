/** Idiomas do site. O primeiro é o padrão. Para adicionar um idioma: crie messages/<código>.json, coloque o código aqui e o nome em LOCALE_NAMES. */
export const LOCALES = ["pt", "en", "es", "fr", "it", "de", "nl", "pl", "uk", "ru", "tr", "ar", "hi", "id", "vi", "th", "ko", "ja", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pt";
export const LOCALE_COOKIE = "pinz-locale";

/** Nome de cada idioma, escrito no próprio idioma (aparece no seletor). */
export const LOCALE_NAMES: Record<Locale, string> = {
  pt: "Português", en: "English", es: "Español", fr: "Français", it: "Italiano", de: "Deutsch", nl: "Nederlands", pl: "Polski", uk: "Українська", ru: "Русский", tr: "Türkçe",
  ar: "العربية", hi: "हिन्दी", id: "Bahasa Indonesia", vi: "Tiếng Việt", th: "ไทย", ko: "한국어", ja: "日本語", zh: "简体中文",
};

/** Código BCP 47 completo (datas, números e <html lang>). */
export const LOCALE_TAGS: Record<Locale, string> = {
  pt: "pt-BR", en: "en-US", es: "es", fr: "fr-FR", it: "it-IT", de: "de-DE", nl: "nl-NL", pl: "pl-PL", uk: "uk-UA", ru: "ru-RU", tr: "tr-TR",
  ar: "ar", hi: "hi-IN", id: "id-ID", vi: "vi-VN", th: "th-TH", ko: "ko-KR", ja: "ja-JP", zh: "zh-CN",
};

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

/** Escolhe o idioma pelo cabeçalho Accept-Language do navegador (ex.: "es-MX,es;q=0.9,en;q=0.8"). */
export function fromAcceptLanguage(header: string | null | undefined): Locale {
  for (const part of (header ?? "").split(",")) {
    const code = part.split(";")[0].trim().toLowerCase().slice(0, 2);
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}
