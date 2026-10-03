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

export type OwnMural = { id: string; slug: string; title: string; question: string; created_at: string; plan: "free" | "full"; welcome_message?: string | null };

/** Murais do usuário logado, do mais antigo ao mais novo (a RLS só deixa ele ver os próprios). */
export async function getOwnMurals(sb: SupabaseClient): Promise<OwnMural[]> {
  const { data } = await sb.from("murals").select("id, slug, title, question, created_at, plan, welcome_message").order("created_at");
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

/** Só aceita caminhos internos ("/maria/meu-mural"), nunca endereços de outros sites. */
export function safeNext(v: string | null | undefined): string | null {
  return v && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : null;
}

const NEXT_KEY = "pinz:next";

/** Lembra para onde voltar depois do login (sobrevive ao e-mail de confirmação). */
export function rememberNext(path: string | null) {
  try {
    if (path) localStorage.setItem(NEXT_KEY, path);
    else localStorage.removeItem(NEXT_KEY);
  } catch {}
}

/** Lê e apaga o destino guardado. */
export function takeNext(): string | null {
  try {
    const v = safeNext(localStorage.getItem(NEXT_KEY));
    localStorage.removeItem(NEXT_KEY);
    return v;
  } catch {
    return null;
  }
}

/** Endereço do login que volta para `next` depois de entrar. */
export const loginUrl = (next: string, signup = false) => `/entrar?${signup ? "" : "modo=entrar&"}next=${encodeURIComponent(next)}`;

export const callbackUrl =() => `${window.location.origin}/auth/callback`;
