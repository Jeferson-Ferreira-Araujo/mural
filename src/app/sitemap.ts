import type { MetadataRoute } from "next";
import { LOCALES, LOCALE_TAGS } from "@/i18n/config";
import { homePath, SITE_URL } from "@/lib/seo";

// data fixa (muda só quando as páginas mudam): o Google confia mais em datas que não mudam a cada visita
const HOME_UPDATED = new Date("2026-10-23");
const LEGAL_UPDATED = new Date("2026-10-23");

/** Página inicial em cada idioma (com hreflang), Termos, Privacidade e Exclusão de dados. Murais e contas ficam fora de propósito. */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages: Record<string, string> = Object.fromEntries(LOCALES.map((l) => [LOCALE_TAGS[l], `${SITE_URL}${homePath(l)}`]));
  languages["x-default"] = `${SITE_URL}/`;
  return [
    ...LOCALES.map((l) => ({ url: `${SITE_URL}${homePath(l)}`, lastModified: HOME_UPDATED, changeFrequency: "weekly" as const, priority: l === "pt" ? 1 : 0.8, alternates: { languages } })),
    { url: `${SITE_URL}/termos`, lastModified: LEGAL_UPDATED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacidade`, lastModified: LEGAL_UPDATED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/exclusao-de-dados`, lastModified: LEGAL_UPDATED, changeFrequency: "yearly", priority: 0.2 },
  ];
}
