import type { Metadata } from "next";
import { ProfileMurals } from "@/components/ProfileMurals";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ nick: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { nick } = await params;
  const who = `@${nick.toLowerCase()}`;
  const title = `Perfil de ${who} no Pinz`;
  const description = "Veja os murais e deixe um recado";
  return {
    title: `Murais de ${nick}`,
    description,
    openGraph: { title, description, siteName: "Pinz", type: "website", locale: "pt_BR" }, // a imagem (cartão de visita) vem de opengraph-image.tsx
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Profile({ params }: Params) {
  const { nick } = await params;
  return <ProfileMurals nick={nick.toLowerCase()} />;
}
