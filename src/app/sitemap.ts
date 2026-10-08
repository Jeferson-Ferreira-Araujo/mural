import type { MetadataRoute } from "next";
import { SITE_HOST } from "@/lib/mural";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = `https://${SITE_HOST}`;
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/termos`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacidade`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/exclusao-de-dados`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
