import type { MetadataRoute } from "next";
import { SITE_HOST } from "@/lib/mural";

/** Só a página inicial, Termos e Privacidade podem ser indexadas; murais, contas e o resto ficam fora. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/$", "/termos", "/privacidade"], disallow: ["/"] }],
    sitemap: `https://${SITE_HOST}/sitemap.xml`,
  };
}
