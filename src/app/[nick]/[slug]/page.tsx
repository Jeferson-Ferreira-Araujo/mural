import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Explorer } from "@/components/Explorer";
import { getPublicMural } from "@/lib/mural";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ nick: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { nick, slug } = await params;
  const mural = await getPublicMural(getServerSupabase(), { nick, slug });
  return mural ? { title: mural.title, description: "Deixe um recado anônimo neste mural." } : { title: "Mural não encontrado" };
}

export default async function PublicMural({ params }: Params) {
  const { nick, slug } = await params;
  const mural = await getPublicMural(getServerSupabase(), { nick, slug });
  if (!mural) notFound();
  return <Explorer initial={mural} />;
}
