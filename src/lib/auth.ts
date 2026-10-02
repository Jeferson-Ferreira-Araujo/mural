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

export type OwnMural = { id: string; slug: string; owner_name: string; title_prefix: "do" | "da" | "de"; tagline: string; question: string };

/** Mural do usuário logado (a RLS só deixa ele ver o próprio). */
export async function getOwnMural(sb: SupabaseClient): Promise<OwnMural | null> {
  const { data } = await sb.from("murals").select("id, slug, owner_name, title_prefix, tagline, question").maybeSingle();
  return (data as OwnMural | null) ?? null;
}

export const callbackUrl = () => `${window.location.origin}/auth/callback`;
