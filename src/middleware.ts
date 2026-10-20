import { NextResponse, type NextRequest } from "next/server";

/**
 * Limite de requisições por IP nas rotas /api (janela de 1 minuto, na memória: o site roda em uma instância só).
 * Rotas caras ou sensíveis têm um teto menor. O webhook do Mercado Pago fica de fora (quem chama é o próprio Mercado Pago).
 * Passou do teto: 429 com Retry-After. Os limites por conta (senha do mural, envio, pagamento) continuam valendo por dentro, no banco e nas rotas.
 */
const WINDOW_MS = 60_000;
const hits = new Map<string, { n: number; reset: number }>();

type Rule = { test: RegExp; max: number; bucket: string };
const RULES: Rule[] = [
  { test: /^\/api\/(pin|avatar)\/verify/, max: 20, bucket: "verify" }, // verificação de imagens (pesada)
  { test: /^\/api\/pay\//, max: 30, bucket: "pay" },
  { test: /^\/api\/account\//, max: 20, bucket: "account" },
  { test: /^\/api\/(places|music|weather)\//, max: 60, bucket: "ext" }, // chamam serviços de fora
];
const DEFAULT_MAX = 240;

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.startsWith("/api/pay/webhook")) return NextResponse.next();
  const rule = RULES.find((r) => r.test.test(path));
  const max = rule?.max ?? DEFAULT_MAX;
  const key = `${rule?.bucket ?? "api"}:${clientIp(req)}`;
  const now = Date.now();
  let h = hits.get(key);
  if (!h || now >= h.reset) {
    h = { n: 0, reset: now + WINDOW_MS };
    hits.set(key, h);
    if (hits.size > 5000) for (const [k, v] of hits) if (now >= v.reset) hits.delete(k); // limpa o que já venceu
  }
  h.n++;
  if (h.n > max) {
    const retry = Math.max(1, Math.ceil((h.reset - now) / 1000));
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(retry) } });
  }
  const res = NextResponse.next();
  res.headers.set("x-ratelimit-remaining", String(Math.max(0, max - h.n)));
  return res;
}

export const config = { matcher: "/api/:path*" };
