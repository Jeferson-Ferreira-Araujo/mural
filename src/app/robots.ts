import type { MetadataRoute } from "next";
import { LOCALES } from "@/i18n/config";
import { SITE_URL } from "@/lib/seo";

/** Podem ser indexadas: a página inicial (em todos os idiomas), Termos, Privacidade e Exclusão de dados; murais, contas, painel e API ficam fora. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/$", ...LOCALES.filter((l) => l !== "pt").map((l) => `/${l}$`), "/termos", "/privacidade", "/exclusao-de-dados"], disallow: ["/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
