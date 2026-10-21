import { createHmac, timingSafeEqual } from "node:crypto";
import { resilientFetch } from "./resilience";
import type { PayProvider } from "./money";

/**
 * Stripe (cobrança em dólar, países fora da América Latina e de Portugal). PREPARADO, mas DESLIGADO: só liga quando o servidor tem
 * STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET no .env. Sem elas, todo mundo continua no Mercado Pago.
 * Sem biblioteca: fala direto com a API REST da Stripe (formulário codificado) e confere a assinatura do webhook aqui mesmo.
 */
const KEY = process.env.STRIPE_SECRET_KEY ?? "";
export const stripeWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET ?? "";

export const stripeConfigured = () => /^sk_(test|live)_/.test(KEY) && stripeWebhookSecret().startsWith("whsec_");

/** Países atendidos pelo Mercado Pago: América Latina e Portugal. Quem está fora disso paga pela Stripe (se ligada). */
const MP_COUNTRIES = new Set(["BR", "AR", "CL", "CO", "MX", "PE", "UY", "BO", "PY", "EC", "VE", "CR", "PA", "DO", "GT", "HN", "NI", "SV", "CU", "PT"]);

/** Chave de produção (sk_live_): a Stripe passa a atender todos os países e o Mercado Pago deixa de ser oferecido. Com chave de teste, só administradores veem a Stripe. */
export const stripeLive = () => /^sk_live_/.test(KEY) && stripeWebhookSecret().startsWith("whsec_");

/** Meio de pagamento pelo país (cabeçalho da Cloudflare). País desconhecido ou Stripe desligada: Mercado Pago. */
export function providerForCountry(country: string | null | undefined): PayProvider {
  const cc = (country ?? "").toUpperCase();
  if (stripeLive()) return "stripe";
  if (stripeConfigured() && /^[A-Z]{2}$/.test(cc) && cc !== "XX" && cc !== "T1" && !MP_COUNTRIES.has(cc)) return "stripe";
  return "mercadopago";
}

/** Achata um objeto no formato de formulário da Stripe: { a: { b: 1 } } → "a[b]=1" (listas viram a[0][b]). */
export function stripeForm(obj: Record<string, unknown>, prefix = "", out: URLSearchParams = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === "object" && x !== null ? stripeForm(x as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(x))));
    else if (typeof v === "object") stripeForm(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function stripeApi<T = Record<string, unknown>>(path: string, init?: { method?: "GET" | "POST" | "DELETE"; body?: Record<string, unknown>; idempotencyKey?: string }): Promise<{ ok: boolean; status: number; data: T }> {
  const method = init?.method ?? "GET";
  const res = await resilientFetch(
    `https://api.stripe.com${path}`,
    {
      method,
      headers: { Authorization: `Bearer ${KEY}`, ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded", ...(init?.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}) } : {}) },
      body: method === "POST" && init?.body ? stripeForm(init.body).toString() : undefined,
      cache: "no-store",
    },
    { service: "stripe", timeoutMs: 15_000, retries: 2 },
  );
  return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as T };
}

/** Confere o cabeçalho Stripe-Signature (t=…,v1=…) do aviso: só vale se foi a Stripe (HMAC-SHA256 com o segredo do webhook) e é recente. */
export function verifyStripeSignature(rawBody: string, header: string | null, secret = stripeWebhookSecret(), toleranceSec = 300): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest();
  return sigs.some((s) => {
    try {
      const got = Buffer.from(s, "hex");
      return got.length === expected.length && timingSafeEqual(got, expected);
    } catch {
      return false;
    }
  });
}
