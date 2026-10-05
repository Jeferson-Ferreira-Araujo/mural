import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

type GooglePlace = { displayName?: { text?: string }; formattedAddress?: string; location?: { latitude?: number; longitude?: number } };

/**
 * Busca de lugares pelo nome (Google Places). A chave fica só no servidor e só quem está logado pode buscar
 * (a cota do Google é paga): 30 buscas por minuto por conta.
 */
export async function GET(req: Request) {
  if (!GOOGLE_KEY || !SUPABASE_URL) return fail(503, "unavailable");

  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return fail(401, "not_authenticated");
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data: u, error: authErr } = await sb.auth.getUser(jwt);
  const uid = u.user?.id;
  if (authErr || !uid) return fail(401, "not_authenticated");
  if (!allow(`places:${uid}`, 30, 60_000)) return fail(429, "rate_limited");

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 3) return fail(400, "invalid_query");

  try {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({ textQuery: q, languageCode: "pt-BR", regionCode: "BR", pageSize: 5 }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return fail(502, "upstream");
    const data = (await r.json()) as { places?: GooglePlace[] };
    const places = (data.places ?? [])
      .map((p) => ({
        name: (p.displayName?.text ?? "Lugar").slice(0, 60),
        address: (p.formattedAddress ?? "").slice(0, 100),
        lat: Number(p.location?.latitude),
        lon: Number(p.location?.longitude),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
    return NextResponse.json({ places });
  } catch {
    return fail(502, "upstream");
  }
}
