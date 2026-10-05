import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

// tamanho lógico da imagem (a tela do aparelho é 16:10) e densidade 2x para ficar nítida
const W = 640;
const H = 400;
/** Onde o lugar aparece na imagem, de cima para baixo (um pouco abaixo do meio, para o pino não ficar atrás do cartão do topo). */
const FOCUS_Y = 0.62;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

const mercY = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2; // 0 (norte) … 1 (sul)
};
const latFromMercY = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;

/**
 * Imagem do mapa do Google (Static Maps) para o cartão de Local. A chave fica no servidor; o navegador guarda a imagem
 * por um dia. Limite de 120 imagens por minuto por endereço, para ninguém gastar a cota do Google por fora.
 */
export async function GET(req: Request) {
  if (!GOOGLE_KEY) return fail(503, "unavailable");
  if (!allow(`map:${clientIp(req)}`, 120, 60_000)) return fail(429, "rate_limited");

  const p = new URL(req.url).searchParams;
  const lat = Number(p.get("lat"));
  const lon = Number(p.get("lon"));
  const z = Math.round(Number(p.get("z")));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 85 || Math.abs(lon) > 180 || !Number.isFinite(z) || z < 4 || z > 18) return fail(400, "invalid_params");

  // desloca o centro para o lugar aparecer em FOCUS_Y (e não no meio exato da imagem)
  const world = 256 * 2 ** z;
  const centerLat = latFromMercY(mercY(lat) - (FOCUS_Y - 0.5) * (H / world));

  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("center", `${centerLat.toFixed(6)},${lon.toFixed(6)}`);
  url.searchParams.set("zoom", String(z));
  url.searchParams.set("size", `${W}x${H}`);
  url.searchParams.set("scale", "2");
  url.searchParams.set("maptype", "roadmap");
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("key", GOOGLE_KEY);

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok || !(r.headers.get("content-type") ?? "").startsWith("image/")) return fail(502, "upstream");
    return new NextResponse(r.body, {
      headers: { "Content-Type": r.headers.get("content-type") ?? "image/png", "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return fail(502, "upstream");
  }
}
