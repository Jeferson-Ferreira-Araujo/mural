import type { Metadata } from "next";
import { ProfileMurals } from "@/components/ProfileMurals";
import { getLocale, getTranslations } from "next-intl/server";

const OG_LOCALE: Record<string, string> = { pt: "pt_BR", en: "en_US", es: "es_ES" };

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ nick: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { nick } = await params;
  const who = `@${nick.toLowerCase()}`;
  const t = await getTranslations("meta");
  const locale = await getLocale();
  const title = t("profileTitle", { who });
  const description = t("profileDescription");
  return {
    title: t("profileTab", { nick }),
    description,
    openGraph: { title, description, siteName: "Pinz", type: "website", locale: OG_LOCALE[locale] ?? "pt_BR" }, // a imagem (cartão de visita) vem de opengraph-image.tsx
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Profile({ params }: Params) {
  const { nick } = await params;
  return <ProfileMurals nick={nick.toLowerCase()} />;
}
