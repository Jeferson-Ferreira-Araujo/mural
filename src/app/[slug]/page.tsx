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
    ? { title: { absolute: mural.title }, description: mural.tagline }
    : { title: "Mural não encontrado" };
}

export default async function PublicMural({ params }: Params) {
  const { slug } = await params;
  const mural = await getPublicMural(getServerSupabase(), slug);
  if (!mural) notFound();
  return (
    <Mural
      slug={mural.slug}
      title={mural.title}
      tagline={mural.tagline}
      question={mural.question}
      stats={mural.stats}
      messages={[]}
    />
  );
}
