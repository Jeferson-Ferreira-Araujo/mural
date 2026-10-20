import type { Metadata } from "next";
import { Explorer } from "@/components/Explorer";
import { getLocale, getTranslations } from "next-intl/server";

const OG_LOCALE: Record<string, string> = { pt: "pt_BR", en: "en_US", es: "es_ES" };

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ nick: string; slug: string }> };

// A prévia do link (WhatsApp, Instagram, Telegram...) diz de quem é o mural, sem mostrar nada do conteúdo. Fica fora do Google (noindex, vem do layout).
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { nick } = await params;
  const who = `@${nick.toLowerCase()}`;
  const t = await getTranslations("meta");
  const locale = await getLocale();
  const title = t("muralTitle", { who });
  const description = t("muralDescription");
  return {
    title: t("muralTab", { who }),
    description,
    openGraph: { title, description, siteName: "Pinz", type: "website", locale: OG_LOCALE[locale] ?? "pt_BR" }, // a imagem vem de opengraph-image.tsx (mural borrado ou real)
    twitter: { card: "summary_large_image", title, description },
  };
}

// o mural só abre para quem entrou na conta: nada dele vai para a página enviada pelo servidor
export default async function PublicMural({ params }: Params) {
  const { nick, slug } = await params;
  return <Explorer initialRef={{ nick: nick.toLowerCase(), slug: slug.toLowerCase() }} />;
}
