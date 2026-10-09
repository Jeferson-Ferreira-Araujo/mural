import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

type Cached = { at: number; data: { temp: number; symbol: string } };
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
  const key = `${la},${lo}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json(hit.data, { headers: { "Cache-Control": "public, max-age=300" } });

  try {
    const r = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${la}&lon=${lo}`, {
      headers: { "User-Agent": "Pinz/1.0 (https://pinz.digital; contato@pinz.digital)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return hit ? NextResponse.json(hit.data) : fail(502, "upstream");
    const j = (await r.json()) as { properties?: { timeseries?: { data?: { instant?: { details?: { air_temperature?: number } }; next_1_hours?: { summary?: { symbol_code?: string } }; next_6_hours?: { summary?: { symbol_code?: string } } } }[] } };
    const now = j.properties?.timeseries?.[0]?.data;
    const temp = now?.instant?.details?.air_temperature;
    const symbol = now?.next_1_hours?.summary?.symbol_code ?? now?.next_6_hours?.summary?.symbol_code ?? "cloudy";
    if (typeof temp !== "number") return hit ? NextResponse.json(hit.data) : fail(502, "upstream");
    const data = { temp: Math.round(temp), symbol };
    cache.set(key, { at: Date.now(), data });
    if (cache.size > 2000) for (const [k, v] of cache) if (Date.now() - v.at > TTL_MS) cache.delete(k);
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return hit ? NextResponse.json(hit.data) : fail(502, "upstream");
  }
}
