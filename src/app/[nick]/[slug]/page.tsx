import type { Metadata } from "next";
import { Explorer } from "@/components/Explorer";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ nick: string; slug: string }> };

// A prévia do link (WhatsApp, Instagram, Telegram...) diz de quem é o mural, sem mostrar nada do conteúdo. Fica fora do Google (noindex, vem do layout).
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { nick } = await params;
  const who = `@${nick.toLowerCase()}`;
  const title = `Mural de ${who} no Pinz`;
  const description = "Deixe um recado no meu mural";
  return {
    title: `Mural de ${who}`,
    description,
    openGraph: { title, description, siteName: "Pinz", type: "website", locale: "pt_BR", images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Pinz" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.jpg"] },
  };
}

// o mural só abre para quem entrou na conta: nada dele vai para a página enviada pelo servidor
export default async function PublicMural({ params }: Params) {
  const { nick, slug } = await params;
  return <Explorer initialRef={{ nick: nick.toLowerCase(), slug: slug.toLowerCase() }} />;
}
