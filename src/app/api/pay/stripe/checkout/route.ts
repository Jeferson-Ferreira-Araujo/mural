import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { giftRecipient, itemForProduct, refFor } from "@/lib/payCatalog";
import { PLUS_PRICE_CENTS } from "@/lib/plans";
import { adminClient, SITE_URL } from "@/lib/mercadopago";
import { currencyForCountry, priceIn } from "@/lib/money";
import { allow } from "@/lib/rateLimit";
import { providerFor } from "@/lib/payProvider";
import { stripeApi, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Nome do produto no recibo da Stripe (em inglês: a cobrança é para quem está fora do Brasil). */
function titleFor(id: string, credits?: number, pt = false): string {
  if (credits) return pt ? `Pinz — ${credits} créditos` : `Pinz — ${credits} credits`;
  if (id === "plus") return pt ? "Pinz — PINZ+ (mensal)" : "Pinz — PINZ+ (monthly)";
  if (id === "plus_month") return pt ? "Pinz — PINZ+ por 1 mês" : "Pinz — PINZ+ for 1 month";
  if (id === "plus_annual") return pt ? "Pinz — PINZ+ anual" : "Pinz — PINZ+ annual";
  if (id === "plus_life") return pt ? "Pinz — PINZ+ vitalício" : "Pinz — PINZ+ lifetime";
  return pt ? "Pinz — presente: 1 mês de PINZ+" : "Pinz — gift: 1 month of PINZ+";
}

/**
 * Começa uma compra pela Stripe (dólar): devolve o endereço do Stripe Checkout. Corpo: { product, recipient? } (mesmos produtos do Mercado Pago).
 * Preço e quantidade vêm SEMPRE do servidor (lib/plans + lib/money). Só funciona com a Stripe ligada e para quem está num país atendido por ela.
 */
export async function POST(req: Request) {
  if (!stripeConfigured()) return fail(503, "unavailable");
  if ((await providerFor(req)) !== "stripe") return fail(403, "wrong_provider");

  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return fail(401, "not_authenticated");
  const { data: u, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }).auth.getUser(jwt);
  const uid = u.user?.id;
  const email = u.user?.email;
  if (authErr || !uid || !email) return fail(401, "not_authenticated");
  if (!allow(`pay:${uid}`, 10, 60_000)) return fail(429, "rate_limited");

  const body = (await req.json().catch(() => ({}))) as { product?: string; recipient?: string };
  const product = String(body.product ?? "");
  const monthly = product === "plus";
  const item = itemForProduct(monthly ? "plus_month" : product);
  if (!item) return fail(400, "invalid_product");

  let recipientId: string | undefined;
  const { data: sub } = await adminClient().from("subscriptions").select("status").eq("user_id", uid).maybeSingle();
  if (item.kind === "gift") {
    const g = await giftRecipient(uid, String(body.recipient ?? "").replace(/^@/, ""));
    if (!g.id) return fail(400, `gift_${g.reason ?? "not_found"}`);
    recipientId = g.id;
  } else if (item.kind === "plus" && (sub?.status === "authorized" || (monthly && sub?.status === "once"))) {
    return fail(409, "already_subscribed");
  }

  const currency = currencyForCountry(req.headers.get("cf-ipcountry")); // reais no Brasil (cartão e Pix, conforme ativado no painel da Stripe), euro, libra etc. nos seus países e dólar no resto
  const brlCents = monthly ? PLUS_PRICE_CENTS : item.cents;
  const cents = priceIn(brlCents, currency);
  const ref = monthly ? uid : refFor(uid, item, recipientId);
  const kindPath = item.kind === "credits" ? "creditos" : "plus";
  const priceData = { currency: currency.toLowerCase(), unit_amount: cents, product_data: { name: titleFor(monthly ? "plus" : item.id, item.credits, currency === "BRL") }, ...(monthly ? { recurring: { interval: "month" } } : {}) };
  const r = await stripeApi<{ url?: string }>("/v1/checkout/sessions", {
    method: "POST",
    idempotencyKey: `${uid}:${product}:${Math.floor(Date.now() / 60_000)}`,
    body: {
      mode: monthly ? "subscription" : "payment",
      client_reference_id: ref,
      customer_email: email,
      line_items: [{ quantity: 1, price_data: priceData }],
      success_url: `${SITE_URL}/pagamento?produto=${kindPath}&status=ok`,
      cancel_url: `${SITE_URL}/pagamento?produto=${kindPath}&status=falhou`,
      metadata: { ref },
      ...(monthly ? { subscription_data: { metadata: { ref } } } : { payment_intent_data: { metadata: { ref } } }),
    },
  });
  if (!r.ok || !r.data.url) return fail(502, "provider_error");
  return NextResponse.json({ url: r.data.url });
}
