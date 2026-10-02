import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthShell, ghostButton } from "@/components/ui";
import { getProfileMurals } from "@/lib/mural";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ nick: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { nick } = await params;
  return { title: `Murais de ${nick}` };
}

/** Página da pessoa: com um único mural abre direto nele (link curto); com vários, lista todos. */
export default async function Profile({ params }: Params) {
  const { nick } = await params;
  const profile = await getProfileMurals(getServerSupabase(), nick);
  if (!profile) notFound();

  if (profile.murals.length === 1) redirect(`/${profile.nickname}/${profile.murals[0].slug}`);

  return (
    <AuthShell>
      <h1 className="font-title text-2xl font-semibold">Murais de {profile.nickname}</h1>
      {profile.murals.length === 0 ? (
        <p className="mt-3 text-[#4a3826]">Essa pessoa ainda não criou nenhum mural.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {profile.murals.map((m) => (
            <li key={m.slug}>
              <Link
                href={`/${profile.nickname}/${m.slug}`}
                className="block rounded-2xl border border-[#e1d3ba] bg-white/60 px-5 py-4 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-[#d98a2b]"
              >
                <span className="font-title block text-lg font-semibold">{m.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/entrar" className={`${ghostButton} mt-6`}>
        Criar o meu mural
      </Link>
    </AuthShell>
  );
}
