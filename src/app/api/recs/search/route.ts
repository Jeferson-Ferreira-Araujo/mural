import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const UA = "Pinz/1.0 (https://pinz.digital; contato@pinz.digital)";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

type Hit = { title: string; sub: string; cover: string };
const cache = new Map<string, { at: number; hits: Hit[] }>();
const TTL_MS = 60 * 60_000;

/** Livros: Open Library (pública e gratuita). Só entram resultados que têm capa. */
async function books(q: string): Promise<Hit[]> {
  const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&lang=pt&limit=24&fields=title,author_name,cover_i,first_publish_year`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8_000) });
  if (!r.ok) throw new Error("upstream");
  const j = (await r.json()) as { docs?: { title?: string; author_name?: string[]; cover_i?: number; first_publish_year?: number }[] };
  return (j.docs ?? [])
    .filter((d) => d.title && Number.isInteger(d.cover_i) && (d.cover_i as number) > 0)
    .slice(0, 8)
    .map((d) => ({
      title: String(d.title).slice(0, 60),
      sub: [d.author_name?.[0], d.first_publish_year].filter(Boolean).join(" · ").slice(0, 70),
      cover: `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`,
    }));
}

/** Séries (e documentários em série): TVmaze (pública e gratuita). Só entram resultados que têm capa. */
async function series(q: string): Promise<Hit[]> {
  const r = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8_000) });
  if (!r.ok) throw new Error("upstream");
  const j = (await r.json()) as { show?: { name?: string; premiered?: string | null; genres?: string[]; image?: { original?: string } | null } }[];
  return (Array.isArray(j) ? j : [])
    .filter((x) => x.show?.name && typeof x.show.image?.original === "string" && /^https:\/\/static\.tvmaze\.com\/uploads\/images\/original_untouched\/[0-9/]{1,24}\.jpg$/.test(x.show.image.original))
    .slice(0, 8)
    .map((x) => ({
      title: String(x.show!.name).slice(0, 60),
      sub: [x.show!.premiered?.slice(0, 4), x.show!.genres?.[0]].filter(Boolean).join(" · "),
      cover: x.show!.image!.original as string,
    }));
}

/**
 * Busca de capas para o display de Recomendação: livros (Open Library) e séries (TVmaze), as duas públicas e gratuitas.
 * Só quem está logado busca (30 por minuto por conta); as respostas ficam guardadas por 1 hora.
 */
export async function GET(req: Request) {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt || !SUPABASE_URL) return fail(401, "not_authenticated");
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data: u, error: authErr } = await sb.auth.getUser(jwt);
  const uid = u.user?.id;
  if (authErr || !uid) return fail(401, "not_authenticated");
  if (!allow(`recs:${uid}`, 30, 60_000)) return fail(429, "rate_limited");

  const sp = new URL(req.url).searchParams;
  const kind = sp.get("kind");
  const q = (sp.get("q") ?? "").trim().slice(0, 80);
  if ((kind !== "book" && kind !== "series") || q.length < 2) return fail(400, "invalid_query");

  const key = `${kind}:${q.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json({ hits: hit.hits });
  try {
    const hits = kind === "book" ? await books(q) : await series(q);
    cache.set(key, { at: Date.now(), hits });
    if (cache.size > 1000) for (const [k, v] of cache) if (Date.now() - v.at > TTL_MS) cache.delete(k);
    return NextResponse.json({ hits });
  } catch {
    return hit ? NextResponse.json({ hits: hit.hits }) : fail(502, "upstream");
  }
}
