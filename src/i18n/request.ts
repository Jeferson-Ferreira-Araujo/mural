import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, fromAcceptLanguage, isLocale, LOCALE_COOKIE, type Locale } from "./config";

/** Idioma de cada visita: o escolhido pela pessoa (cookie) ou, na primeira vez, o do navegador. As mensagens de um idioma sem tradução caem no português. */
export default getRequestConfig(async () => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(saved) ? saved : fromAcceptLanguage((await headers()).get("accept-language"));
  const base = (await import("../../messages/pt.json")).default;
  const own = locale === DEFAULT_LOCALE ? base : (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages: mergeMessages(base, own) };
});

type Tree = { [k: string]: string | Tree };
/** Completa o idioma escolhido com o português onde ainda falta tradução (nunca aparece chave solta). */
function mergeMessages(base: Tree, own: Tree): Tree {
  const out: Tree = { ...base };
  for (const [k, v] of Object.entries(own)) out[k] = typeof v === "object" && typeof base[k] === "object" ? mergeMessages(base[k] as Tree, v) : v;
  return out;
}
