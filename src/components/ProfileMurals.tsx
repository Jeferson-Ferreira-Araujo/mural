"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loginUrl, useSession } from "@/lib/auth";
import { getProfileMurals, type ProfileMurals as Profile } from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import { AuthShell, ghostButton, Spinner } from "@/components/ui";

/** Página da pessoa (só para quem entrou na conta): com um único mural abre direto nele; com vários, lista todos. */
export function ProfileMurals({ nick }: { nick: string }) {
  const router = useRouter();
  const { session, loading } = useSession();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    if (!session) return;
    void getProfileMurals(getBrowserSupabase(), nick).then((p) => {
      if (p && p.murals.length === 1) router.replace(`/${p.nickname}/${p.murals[0].slug}`);
      else setProfile(p);
    });
  }, [session, nick, router]);

  if (loading || (session && profile === undefined)) {
    return (
      <AuthShell>
        <Spinner />
      </AuthShell>
    );
  }

  if (!session) {
    return (
      <AuthShell>
        <h1 className="font-title text-2xl font-semibold">Entre para ver os murais de {nick}</h1>
        <div className="mt-5 grid gap-2">
          <Link href={loginUrl(`/${nick}`)} className={ghostButton}>
            Entrar
          </Link>
          <Link href={loginUrl(`/${nick}`, true)} className={ghostButton}>
            Criar conta
          </Link>
        </div>
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
