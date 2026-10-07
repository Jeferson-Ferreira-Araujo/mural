import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { embedFor } from "@/lib/embed";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });
const clean = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const mmss = (secs: number) => (Number.isFinite(secs) && secs > 0 ? `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, "0")}` : null);

type Meta = { title: string; artist: string; duration: string | null };
const cache = new Map<string, { at: number; meta: Meta }>();
const TTL = 6 * 3600_000;

async function get(url: string, headers: Record<string, string> = {}) {
  return fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9", ...headers }, signal: AbortSignal.timeout(5000), cache: "no-store" });
}

/** YouTube: o nome e o canal vêm do oEmbed oficial; a duração, do HTML público do vídeo. */
async function youtube(id: string): Promise<Meta | null> {
  const o = await get(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`);
  if (!o.ok) return null;
  const j = (await o.json()) as { title?: string; author_name?: string };
  let secs = 0;
  try {
    const page = await (await get(`https://www.youtube.com/watch?v=${id}`, { Cookie: "CONSENT=YES+1" })).text();
    // a marcação do próprio vídeo (itemprop) é a mais exata; o campo lengthSeconds é o plano B
    const m = /itemprop="duration" content="PT(?:(d+)H)?(?:(d+)M)?(?:(d+)S)?"/.exec(page);
    if (m) secs = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
    if (!secs) secs = Number(/"lengthSeconds":"(d+)"/.exec(page)?.[1] ?? 0);
  } catch {
    /* sem duração: o player informa o tempo exato quando começa a tocar */
  }
  return { title: clean(j.title, 90), artist: clean(j.author_name, 60), duration: mmss(secs) };
}

/** Spotify: a página pública de incorporação traz nome, artistas e duração (em milissegundos) da faixa. */
async function spotify(kind: string, id: string): Promise<Meta | null> {
  const r = await get(`https://open.spotify.com/embed/${kind}/${id}`);
  if (!r.ok) return null;
  const html = await r.text();
  const raw = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (!raw) return null;
  const e = (JSON.parse(raw) as { props?: { pageProps?: { state?: { data?: { entity?: { name?: string; title?: string; duration?: number; artists?: { name?: string }[]; subtitle?: string } } } } } }).props?.pageProps?.state?.data?.entity;
  if (!e) return null;
  const artist = e.artists?.length ? e.artists.map((a) => a.name).filter(Boolean).join(", ") : (e.subtitle ?? "");
  return { title: clean(e.name ?? e.title, 90), artist: clean(artist, 60), duration: kind === "track" || kind === "episode" ? mmss((e.duration ?? 0) / 1000) : null };
}

/**
 * Nome, artista e duração de um link de música do Spotify ou do YouTube (só esses endereços; o link nunca é usado direto).
 * Só quem está logado consulta (30 por minuto por conta); o resultado fica guardado por 6 horas.
 */
export async function GET(req: Request) {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt || !SUPABASE_URL) return fail(401, "not_authenticated");
  const { data: u, error } = await createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }).auth.getUser(jwt);
  const uid = u.user?.id;
  if (error || !uid) return fail(401, "not_authenticated");
  if (!allow(`music:${uid}`, 30, 60_000)) return fail(429, "rate_limited");

  const emb = embedFor(new URL(req.url).searchParams.get("url") ?? "");
  if (!emb) return fail(400, "invalid_link");
  const sp = emb.provider === "spotify" ? /\/embed\/(\w+)\/(\w+)/.exec(emb.src) : null;
  const key = emb.provider === "youtube" ? `yt:${emb.id}` : `sp:${sp?.[1]}:${sp?.[2]}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.meta);

  try {
    const meta = emb.provider === "youtube" && emb.id ? await youtube(emb.id) : sp ? await spotify(sp[1], sp[2]) : null;
    if (!meta || !meta.title) return fail(404, "not_found");
    if (cache.size > 500) cache.clear();
    cache.set(key, { at: Date.now(), meta });
    return NextResponse.json(meta);
  } catch {
    return fail(502, "lookup_failed");
  }
}
