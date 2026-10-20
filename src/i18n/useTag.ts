"use client";

import { useLocale } from "next-intl";
import { LOCALE_TAGS, isLocale } from "./config";

/** Código BCP 47 do idioma atual (ex.: "pt-BR"), para formatar datas e números. */
export function useTag(): string {
  const l = useLocale();
  return LOCALE_TAGS[isLocale(l) ? l : "pt"];
}
