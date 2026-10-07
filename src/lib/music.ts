import { getBrowserSupabase } from "./supabase";

export type MusicMeta = { title: string; artist: string; duration: string | null };

/** Nome, artista e duração de um link do Spotify ou do YouTube (null = não achou; o pin continua valendo só com o link). */
export async function fetchMusicMeta(link: string): Promise<MusicMeta | null> {
  const { data } = await getBrowserSupabase().auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) return null;
  try {
    const res = await fetch(`/api/music/meta?url=${encodeURIComponent(link)}`, { headers: { Authorization: `Bearer ${jwt}` } });
    return res.ok ? ((await res.json()) as MusicMeta) : null;
  } catch {
    return null;
  }
}
