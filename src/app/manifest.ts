import type { MetadataRoute } from "next";

/** Manifesto do app instalável (PWA): nome, cores, modo de tela cheia e ícones. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Pinz",
    short_name: "Pinz",
    description: "O Pinz é um mural digital para colecionar momentos: receba recados, fotos, músicas e vídeos de quem você ama.",
    lang: "pt-BR",
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
