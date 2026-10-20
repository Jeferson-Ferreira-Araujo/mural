import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, fromAcceptLanguage, isLocale, LOCALE_COOKIE, LOCALE_TAGS, type Locale } from "./config";

/** Idioma da requisição (rotas /api e páginas): o cookie escolhido pela pessoa ou, sem ele, o do navegador. */
export async function requestLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return fromAcceptLanguage((await headers()).get("accept-language")) ?? DEFAULT_LOCALE;
}

/** Código BCP 47 do idioma da requisição (ex.: "pt-BR"). */
export async function requestTag(): Promise<string> {
  return LOCALE_TAGS[await requestLocale()];
}
