import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
/** Chaves do app do Spotify (gratuito em developer.spotify.com): só no servidor. Sem elas, a busca por nome fica indisponível e só vale colar o link. */
const SP_ID = process.env.SPOTIFY_CLIENT_ID ?? "";
const SP_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? "";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });
const clean = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

type Song = { track: string; title: string; artist: string; cover: string | null };
const COVER_OK = /^https:\/\/(i\.scdn\.co|mosaic\.scdn\.co|image-cdn-[a-z0-9-]{1,12}\.spotifycdn\.com)\/[A-Za-z0-9/_-]{1,200}$/;
const cover = (u: unknown) => (typeof u === "string" && COVER_OK.test(u) ? u : null);

let token: { value: string; exp: number } | null = null;
/** Autorização do app (sem login de ninguém): vale 1 hora, guardada em memória. */
async function appToken(): Promise<string | null> {
  if (!SP_ID || !SP_SECRET) return null;
  if (token && token.exp > Date.now() + 30_000) return token.value;
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${SP_ID}:${SP_SECRET}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(8_000),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) return null;
  token = { value: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return token.value;
}

async function search(q: string): Promise<Song[] | null> {
  const t = await appToken();
  if (!t) return null;
  const r = await fetch(`https://api.spotify.com/v1/search?type=track&limit=8&market=BR&q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${t}` }, signal: AbortSignal.timeout(8_000) });
  if (r.status === 401) token = null;
  if (!r.ok) throw new Error("upstream");
  const j = (await r.json()) as { tracks?: { items?: { id?: string; name?: string; artists?: { name?: string }[]; album?: { images?: { url?: string; width?: number }[] } }[] } };
  return (j.tracks?.items ?? [])
    .filter((x) => x.id && /^[A-Za-z0-9]{22}$/.test(x.id) && x.name)
    .map((x) => {
      const imgs = (x.album?.images ?? []).slice().sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
      const img = imgs.find((i) => (i.width ?? 0) >= 200) ?? imgs[imgs.length - 1];
      return { track: x.id as string, title: clean(x.name, 80), artist: clean((x.artists ?? []).map((a) => a.name).filter(Boolean).join(", "), 70), cover: cover(img?.url) };
    });
}

/** Link de uma faixa do Spotify: nome e capa vêm do oEmbed oficial (sem chave); os artistas, da página pública de incorporação. */
async function fromLink(id: string): Promise<Song | null> {
  const [o, e] = await Promise.all([
    fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${id}`)}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6_000) }),
    fetch(`https://open.spotify.com/embed/track/${id}`, { headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9" }, signal: AbortSignal.timeout(6_000) }),
  ]);
  if (!o.ok) return null;
  const oj = (await o.json()) as { title?: string; thumbnail_url?: string };
  let artist = "";
  try {
    const raw = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(await e.text())?.[1];
    const ent = raw ? (JSON.parse(raw) as { props?: { pageProps?: { state?: { data?: { entity?: { artists?: { name?: string }[]; subtitle?: string } } } } } }).props?.pageProps?.state?.data?.entity : null;
    artist = ent?.artists?.length ? ent.artists.map((a) => a.name).filter(Boolean).join(", ") : (ent?.subtitle ?? "");
  } catch {
    /* sem artista: o cartão mostra só o nome da música */
  }
  if (!oj.title) return null;
  return { track: id, title: clean(oj.title, 80), artist: clean(artist, 70), cover: cover(oj.thumbnail_url) };
}

const cache = new Map<string, { at: number; value: unknown }>();
const TTL = 3600_000;

/**
 * Música favorita: `?q=nome` busca faixas no Spotify (precisa das chaves do app no servidor) e `?url=link` lê um link do Spotify.
 * Só quem está logado consulta (30 por minuto por conta); as respostas ficam guardadas por 1 hora.
 */
export async function GET(req: Request) {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt || !SUPABASE_URL) return fail(401, "not_authenticated");
  const { data: u, error } = await createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }).auth.getUser(jwt);
  const uid = u.user?.id;
  if (error || !uid) return fail(401, "not_authenticated");
  if (!allow(`song:${uid}`, 30, 60_000)) return fail(429, "rate_limited");

  const sp = new URL(req.url).searchParams;
  const q = clean(sp.get("q"), 80);
  const link = clean(sp.get("url"), 300);

  try {
    if (link) {
      const m = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/([A-Za-z0-9]{22})/.exec(link);
      if (!m) return fail(400, "invalid_link");
      const key = `l:${m[1]}`;
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ songs: [hit.value] });
      const song = await fromLink(m[1]);
      if (!song) return fail(404, "not_found");
      cache.set(key, { at: Date.now(), value: song });
      return NextResponse.json({ songs: [song] });
    }
    if (q.length < 2) return fail(400, "invalid_query");
    if (!SP_ID || !SP_SECRET) return fail(503, "search_unavailable");
    const key = `q:${q.toLowerCase()}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ songs: hit.value });
    const songs = await search(q);
    if (!songs) return fail(503, "search_unavailable");
    cache.set(key, { at: Date.now(), value: songs });
    if (cache.size > 1000) for (const [k, v] of cache) if (Date.now() - v.at > TTL) cache.delete(k);
    return NextResponse.json({ songs });
  } catch {
    return fail(502, "upstream");
  }
}
