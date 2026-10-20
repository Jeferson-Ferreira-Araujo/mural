import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { resilientFetch } from "@/lib/resilience";
import { requestTag } from "@/i18n/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

type Cached = { at: number; data: { temp: number; symbol: string; place?: string } };
const places = new Map<string, { at: number; name: string | null }>(); // nome do lugar por coordenada (muda pouco: guardado por um dia)
const PLACE_TTL_MS = 24 * 3_600_000;

/** Nome da cidade de uma coordenada (OpenStreetMap/Nominatim). Falhou ou não achou: null (o display usa "Sua localização"). */
async function placeName(la: string, lo: string, tag: string): Promise<string | null> {
  const key = `${la},${lo},${tag}`;
  const hit = places.get(key);
  if (hit && Date.now() - hit.at < PLACE_TTL_MS) return hit.name;
  try {
    const r = await resilientFetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=${tag}&lat=${la}&lon=${lo}`, { headers: { "User-Agent": "Pinz/1.0 (https://pinz.digital; contato@pinz.digital)" } }, { service: "nominatim", timeoutMs: 6_000, retries: 1 });
    if (!r.ok) return hit?.name ?? null;
    const j = (await r.json()) as { address?: { city?: string; town?: string; village?: string; municipality?: string; suburb?: string; county?: string } };
    const a = j.address;
    const name = (a?.city ?? a?.town ?? a?.village ?? a?.municipality ?? a?.suburb ?? a?.county ?? "").trim().slice(0, 60) || null;
    places.set(key, { at: Date.now(), name });
    if (places.size > 2000) for (const [k, v] of places) if (Date.now() - v.at > PLACE_TTL_MS) places.delete(k);
    return name;
  } catch {
    return hit?.name ?? null;
  }
}
const cache = new Map<string, Cached>();
const TTL_MS = 20 * 60_000;

/**
 * Tempo agora numa coordenada (pin "Clima"). Fonte: MET Norway (gratuita, uso comercial permitido, exige identificação e atribuição).
 * Quem pede é qualquer visitante do mural, então a resposta fica guardada por 20 minutos (coordenada arredondada a ~1 km)
 * e há limite por endereço.
 */
export async function GET(req: Request) {
  if (!allow(`weather:${clientIp(req)}`, 60, 60_000)) return fail(429, "rate_limited");
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return fail(400, "invalid_coordinates");
  const la = lat.toFixed(2);
  const lo = lon.toFixed(2);
  const key = `${la},${lo}${sp.get("place") === "1" ? "+p" : ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json(hit.data, { headers: { "Cache-Control": "public, max-age=300" } });

  try {
    const tag = await requestTag();
    const [r, place] = await Promise.all([
      resilientFetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${la}&lon=${lo}`, {
        headers: { "User-Agent": "Pinz/1.0 (https://pinz.digital; contato@pinz.digital)" },
      }, { service: "metno", timeoutMs: 10_000, retries: 1 }),
      sp.get("place") === "1" ? placeName(la, lo, tag) : Promise.resolve(null), // o nome só é buscado quando a localização é de quem vê
    ]);
    if (!r.ok) return hit ? NextResponse.json(hit.data) : fail(502, "upstream");
    const j = (await r.json()) as { properties?: { timeseries?: { data?: { instant?: { details?: { air_temperature?: number } }; next_1_hours?: { summary?: { symbol_code?: string } }; next_6_hours?: { summary?: { symbol_code?: string } } } }[] } };
    const now = j.properties?.timeseries?.[0]?.data;
    const temp = now?.instant?.details?.air_temperature;
    const symbol = now?.next_1_hours?.summary?.symbol_code ?? now?.next_6_hours?.summary?.symbol_code ?? "cloudy";
    if (typeof temp !== "number") return hit ? NextResponse.json(hit.data) : fail(502, "upstream");
    const data = { temp: Math.round(temp), symbol, ...(place ? { place } : {}) };
    cache.set(key, { at: Date.now(), data });
    if (cache.size > 2000) for (const [k, v] of cache) if (Date.now() - v.at > TTL_MS) cache.delete(k);
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return hit ? NextResponse.json(hit.data) : fail(502, "upstream");
  }
}
