import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mural } from "@/components/Mural";
import { getPublicMural } from "@/lib/mural";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const mural = await getPublicMural(getServerSupabase(), slug);
  return mural
    ? { title: { absolute: `Mural ${mural.title_prefix} ${mural.owner_name}` }, description: mural.tagline }
    : { title: "Mural não encontrado" };
}

export default async function PublicMural({ params }: Params) {
  const { slug } = await params;
  const mural = await getPublicMural(getServerSupabase(), slug);
  if (!mural) notFound();
  return (
    <Mural
      slug={mural.slug}
      owner={mural.owner_name}
      prefix={mural.title_prefix}
      tagline={mural.tagline}
      question={mural.question}
      stats={mural.stats}
      messages={[]}
    />
  );
}
