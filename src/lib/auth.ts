"use client";

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "./supabase";

/** Sessão do navegador. `loading` fica true até o Supabase responder. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const sb = getBrowserSupabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

export type OwnMural = { id: string; slug: string; title: string; tagline: string; question: string; created_at: string };

/** Murais do usuário logado, do mais antigo ao mais novo (a RLS só deixa ele ver os próprios). */
export async function getOwnMurals(sb: SupabaseClient): Promise<OwnMural[]> {
  const { data } = await sb.from("murals").select("id, slug, title, tagline, question, created_at").order("created_at");
  return (data as OwnMural[] | null) ?? [];
}

/** Nickname do usuário logado (definido no cadastro). */
export async function getOwnNickname(sb: SupabaseClient): Promise<string | null> {
  const { data } = await sb.from("profiles").select("nickname").maybeSingle();
  return (data as { nickname: string } | null)?.nickname ?? null;
}

/** Depois de entrar: quem já tem mural vai para o painel; quem não tem, para a criação. */
export async function homeRouteFor(sb: SupabaseClient): Promise<string> {
  return (await getOwnMurals(sb)).length > 0 ? "/painel" : "/criar";
}

export const callbackUrl = () => `${window.location.origin}/auth/callback`;
