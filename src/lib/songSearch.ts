import { getBrowserSupabase } from "./supabase";

export type SongHit = { track: string; title: string; artist: string; cover: string | null };
export class SearchUnavailable extends Error {}

async function call(qs: string): Promise<SongHit[]> {
  const { data } = await getBrowserSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("not_authenticated");
  const res = await fetch(`/api/music/track?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 503) throw new SearchUnavailable();
  if (!res.ok) throw new Error("lookup failed");
  return ((await res.json()) as { songs?: SongHit[] }).songs ?? [];
}

/** Busca faixas no Spotify pelo nome (precisa da busca ativa no servidor; senão lança SearchUnavailable). */
export const searchSongs = (q: string) => call(`q=${encodeURIComponent(q)}`);
/** Lê um link de faixa do Spotify (nome, artista e capa). */
export const songFromLink = (url: string) => call(`url=${encodeURIComponent(url)}`).then((l) => l[0] ?? null);

/** É um link de faixa do Spotify? */
export const isSpotifyTrackLink = (s: string) => /open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/[A-Za-z0-9]{22}/.test(s);

/** Endereço do player oficial do Spotify (o código da faixa é validado antes). */
export const spotifyEmbed = (track?: string) => (track && /^[A-Za-z0-9]{22}$/.test(track) ? `https://open.spotify.com/embed/track/${track}?utm_source=pinz` : null);
