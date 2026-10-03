import type { Metadata } from "next";
import { Explorer } from "@/components/Explorer";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ nick: string; slug: string }> };

// o mural só abre para quem entrou na conta: nada dele vai para a página enviada pelo servidor
export const metadata: Metadata = { title: "Mural", description: "Deixe um pin neste mural." };

export default async function PublicMural({ params }: Params) {
  const { nick, slug } = await params;
  return <Explorer initialRef={{ nick: nick.toLowerCase(), slug: slug.toLowerCase() }} />;
}
