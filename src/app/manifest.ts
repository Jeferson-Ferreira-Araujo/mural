import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { requestTag } from "@/i18n/server";

/** Manifesto do app instalável (PWA): nome, cores, modo de tela cheia e ícones. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("meta");
  const lang = await requestTag();
  return {
    id: "/",
    name: "Pinz",
    short_name: "Pinz",
    description: t("siteDescription"),
    lang,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#3b2616",
    theme_color: "#3b2616",
    categories: ["social", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
