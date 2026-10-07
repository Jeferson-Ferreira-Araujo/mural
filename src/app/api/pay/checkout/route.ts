import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { CREDIT_PACKS, PLUS_PRICE_CENTS } from "@/lib/plans";
import { adminClient, mp, paymentsConfigured, SITE_URL } from "@/lib/mercadopago";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Começa uma compra: devolve o endereço do Mercado Pago onde a pessoa paga.
 * Corpo: { product: "plus" } ou { product: "credits:c11" }. Preço e quantidade vêm SEMPRE daqui (lib/plans), nunca do navegador.
 */
export async function POST(req: Request) {
  if (!paymentsConfigured()) return fail(503, "unavailable");

  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return fail(401, "not_authenticated");
  const { data: u, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }).auth.getUser(jwt);
  const uid = u.user?.id;
  const email = u.user?.email;
  if (authErr || !uid || !email) return fail(401, "not_authenticated");
  if (!allow(`pay:${uid}`, 10, 60_000)) return fail(429, "rate_limited");

  const body = (await req.json().catch(() => ({}))) as { product?: string };
  const product = String(body.product ?? "");

  if (product === "plus") {
    const { data: sub } = await adminClient().from("subscriptions").select("status").eq("user_id", uid).maybeSingle();
    if (sub?.status === "authorized") return fail(409, "already_subscribed");
    const r = await mp<{ init_point?: string; message?: string }>("/preapproval", {
      method: "POST",
      body: {
        reason: "Pinz PLUS (mensal)",
        external_reference: uid,
        payer_email: email,
        back_url: `${SITE_URL}/pagamento?produto=plus`,
        status: "pending",
        auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: PLUS_PRICE_CENTS / 100, currency_id: "BRL" },
      },
    });
    if (!r.ok || !r.data.init_point) return fail(502, "provider_error");
    return NextResponse.json({ url: r.data.init_point });
  }

  const pack = product.startsWith("credits:") ? CREDIT_PACKS.find((p) => p.id === product.slice(8)) : undefined;
  if (!pack) return fail(400, "invalid_product");
  const r = await mp<{ init_point?: string }>("/checkout/preferences", {
    method: "POST",
    body: {
      items: [{ id: pack.id, title: `Pinz — ${pack.credits} créditos`, quantity: 1, unit_price: pack.cents / 100, currency_id: "BRL" }],
      external_reference: `${uid}:${pack.id}`,
      notification_url: `${SITE_URL}/api/pay/webhook`,
      back_urls: { success: `${SITE_URL}/pagamento?produto=creditos&status=ok`, pending: `${SITE_URL}/pagamento?produto=creditos&status=pendente`, failure: `${SITE_URL}/pagamento?produto=creditos&status=falhou` },
      auto_return: "approved",
      statement_descriptor: "PINZ",
    },
  });
  if (!r.ok || !r.data.init_point) return fail(502, "provider_error");
  return NextResponse.json({ url: r.data.init_point });
}
