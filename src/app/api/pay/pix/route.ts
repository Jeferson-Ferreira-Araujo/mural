import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { CREDIT_PACKS } from "@/lib/plans";
import { mp, paymentsConfigured, SITE_URL } from "@/lib/mercadopago";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const EXPIRES_MIN = 30;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Pix dentro do Pinz: cria a cobrança no Mercado Pago e devolve o código (copia e cola) e a imagem do QR code, para a tela do Pinz mostrar.
 * Corpo: { product: "credits:<id do pacote>" }. Preço e quantidade vêm SEMPRE de lib/plans, nunca do navegador. O crédito entra pelo mesmo aviso (webhook) de sempre.
 */
export async function POST(req: Request) {
  if (!(await paymentsConfigured())) return fail(503, "unavailable");
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return fail(401, "not_authenticated");
  const { data: u, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }).auth.getUser(jwt);
  const uid = u.user?.id;
  const email = u.user?.email;
  if (authErr || !uid || !email) return fail(401, "not_authenticated");
  if (!allow(`pix:${uid}`, 8, 60_000)) return fail(429, "rate_limited");

  const body = (await req.json().catch(() => ({}))) as { product?: string };
  const product = String(body.product ?? "");
  const pack = product.startsWith("credits:") ? CREDIT_PACKS.find((p) => p.id === product.slice(8)) : undefined;
  if (!pack) return fail(400, "invalid_product");

  const expires = new Date(Date.now() + EXPIRES_MIN * 60_000);
  const r = await mp<{ id?: number; point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } } }>("/v1/payments", {
    method: "POST",
    body: {
      transaction_amount: pack.cents / 100,
      description: `Pinz — ${pack.credits} créditos`,
      payment_method_id: "pix",
      payer: { email },
      external_reference: `${uid}:${pack.id}`,
      notification_url: `${SITE_URL}/api/pay/webhook`,
      statement_descriptor: "PINZ",
      date_of_expiration: expires.toISOString().replace("Z", "+00:00"),
    },
  });
  const td = r.data.point_of_interaction?.transaction_data;
  if (!r.ok || !r.data.id || !td?.qr_code) return fail(502, "provider_error");
  return NextResponse.json({ id: String(r.data.id), qr: td.qr_code, qrBase64: td.qr_code_base64 ?? null, expires: expires.toISOString() });
}
