import { getBrowserSupabase } from "./supabase";

export type RecKind = "book" | "movie" | "series" | "doc";
export type RecHit = { title: string; sub: string; cover: string };

export const REC_KIND_LABEL: Record<RecKind, string> = { book: "Livro", movie: "Filme", series: "Série", doc: "Documentário" };
/** Tipos que têm busca de capa (as fontes públicas e gratuitas); os outros usam a foto que a pessoa enviar. */
export const REC_SEARCHABLE: ReadonlySet<RecKind> = new Set(["book", "series"]);

/** Busca livros (Open Library) ou séries (TVmaze) pelo nome, pelo nosso servidor (só para quem está logado). */
export async function searchRecs(kind: "book" | "series", q: string): Promise<RecHit[]> {
  const { data } = await getBrowserSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("not_authenticated");
  const res = await fetch(`/api/recs/search?kind=${kind}&q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("search failed");
  return ((await res.json()) as { hits?: RecHit[] }).hits ?? [];
}

/** De onde vem a capa (para o crédito no display): só as fontes que pedem referência. */
export function coverCredit(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith("https://covers.openlibrary.org/")) return "Open Library";
  if (url.startsWith("https://static.tvmaze.com/")) return "TVmaze";
  return null;
}
