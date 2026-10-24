import { LOCALES, LOCALE_TAGS, type Locale } from "@/i18n/config";
import { SITE_HOST } from "@/lib/mural";

export const SITE_URL = `https://${SITE_HOST}`;

/** Endereço da página inicial em cada idioma: o português é a raiz, os outros ficam em /<código>. */
export const homePath = (l: Locale) => (l === "pt" ? "/" : `/${l}`);

/** hreflang: cada idioma aponta para o seu endereço, mais o "x-default" (raiz). */
export function hreflangMap(): Record<string, string> {
  const m: Record<string, string> = {};
  for (const l of LOCALES) m[LOCALE_TAGS[l]] = homePath(l);
  m["x-default"] = "/";
  return m;
}
