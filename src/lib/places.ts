import { getBrowserSupabase } from "./supabase";

export type PlaceHit = { name: string; address: string; lat: number; lon: number };

/** Busca de lugares pelo nome (Google Places, pelo nosso servidor: só para quem está logado). Só roda quando a pessoa pede. */
export async function searchPlaces(q: string): Promise<PlaceHit[]> {
  const { data } = await getBrowserSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("not_authenticated");
  const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("search failed");
  const body = (await res.json()) as { places?: PlaceHit[] };
  return (body.places ?? []).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
}
