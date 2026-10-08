"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getProfileMurals, type ProfileMurals as Profile } from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import { AuthShell, ghostButton, Spinner } from "@/components/ui";

/** Página da pessoa (só para quem entrou na conta): com um único mural abre direto nele; com vários, lista todos. */
export function ProfileMurals({ nick }: { nick: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    void getProfileMurals(getBrowserSupabase(), nick).then((p) => {
      // com ?primeiro (vem do @ no detalhe de um pin) abre direto o primeiro mural da pessoa
      const first = new URLSearchParams(window.location.search).has("primeiro");
      if (p && p.murals.length > 0 && (p.murals.length === 1 || first)) router.replace(`/${p.nickname}/${p.murals[0].slug}`);
      else setProfile(p);
    });
  }, [nick, router]);

  if (profile === undefined) {
    return (
      <AuthShell>
        <Spinner />
      </AuthShell>
    );
  }

  if (!profile) {
    return (
      <AuthShell>
        <h1 className="font-title text-2xl font-semibold">Pessoa não encontrada</h1>
        <Link href="/" className={`${ghostButton} mt-6`}>
          Voltar
        </Link>
      </AuthShell>
    );
  }

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
    </AuthShell>
  );
}
