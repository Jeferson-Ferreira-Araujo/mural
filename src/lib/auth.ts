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
    let checked: string | null = null;
    // entrar de novo numa conta que estava desativada (exclusão pedida) a reativa: a pessoa volta como estava
    const apply = async (s: Session | null) => {
      if (s?.user && checked !== s.user.id) {
        checked = s.user.id;
        const { data } = await sb.rpc("reactivate_account");
        if (data === true) {
          try {
            sessionStorage.setItem("pinz:reactivated", "1");
          } catch {}
        }
      }
      setSession(s);
      setLoading(false);
    };
    sb.auth.getSession().then(({ data }) => void apply(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => {
      setTimeout(() => void apply(s), 0); // não chama o Supabase de dentro do próprio aviso de login
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

export type OwnMural = { id: string; slug: string; title: string; question: string; created_at: string; plan: "free" | "full"; welcome_message?: string | null };

/** Murais do usuário logado, do mais antigo ao mais novo (a RLS só deixa ele ver os próprios). */
export async function getOwnMurals(sb: SupabaseClient): Promise<OwnMural[]> {
  const { data } = await sb.from("murals").select("id, slug, title, question, created_at, plan, welcome_message").eq("kind", "personal").order("created_at");
  return (data as OwnMural[] | null) ?? [];
}

/** Nickname do usuário logado (definido no cadastro). */
export async function getOwnNickname(sb: SupabaseClient): Promise<string | null> {
  const { data } = await sb.from("profiles").select("nickname").maybeSingle();
  return (data as { nickname: string } | null)?.nickname ?? null;
}

/** Nome de usuário e se a pessoa já o escolheu (quem entra por login social começa com um nome automático). */
export async function getOwnProfile(sb: SupabaseClient): Promise<{ nickname: string; confirmed: boolean } | null> {
  const { data } = await sb.from("profiles").select("nickname, nickname_confirmed").maybeSingle();
  const p = data as { nickname: string; nickname_confirmed: boolean } | null;
  return p ? { nickname: p.nickname, confirmed: p.nickname_confirmed } : null;
}

/** Depois de entrar: o próprio mural da pessoa (ou a criação, se ainda não tiver). */
export async function homeRouteFor(sb: SupabaseClient): Promise<string> {
  const [murals, nick] = await Promise.all([getOwnMurals(sb), getOwnNickname(sb)]);
  return nick && murals.length > 0 ? `/${nick}/${murals[0].slug}` : "/criar";
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
