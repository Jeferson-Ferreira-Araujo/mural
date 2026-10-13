import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { applyPayment, giftRecipient, itemForProduct, refFor } from "@/lib/payCatalog";
import { adminClient, mp, paymentsConfigured, SITE_URL } from "@/lib/mercadopago";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Motivo da recusa em português simples (o Mercado Pago devolve um código). */
function reason(detail: string): string {
  if (detail === "cc_rejected_insufficient_amount") return "Saldo ou limite insuficiente neste cartão.";
  if (detail.startsWith("cc_rejected_bad_filled")) return "Confira os dados do cartão (número, validade e código).";
  if (detail === "cc_rejected_call_for_authorize") return "O banco pede autorização. Ligue para ele ou use outro cartão.";
  if (detail === "cc_rejected_card_disabled") return "Este cartão está desativado. Use outro cartão.";
  if (detail === "cc_rejected_duplicated_payment") return "Esse pagamento já foi feito há pouco.";
  if (detail === "cc_rejected_max_attempts") return "Muitas tentativas com este cartão. Use outro cartão.";
  return "O pagamento foi recusado. Tente outro cartão.";
}

/**
 * Cartão dentro do Pinz: recebe só o CÓDIGO do cartão gerado pelo Mercado Pago no navegador (o número, a validade e o CVV nunca passam por aqui)
 * e cria o pagamento. Preço e o que se compra vêm SEMPRE de lib/payCatalog. O efeito entra na hora, pela mesma conta do aviso (webhook), que nunca soma duas vezes.
 * Corpo: { product, token, paymentMethodId, issuerId?, identification?, recipient? (só no presente) }
 */
export async function POST(req: Request) {
  if (!(await paymentsConfigured())) return fail(503, "unavailable");
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return fail(401, "not_authenticated");
  const { data: u, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }).auth.getUser(jwt);
  const uid = u.user?.id;
  const email = u.user?.email;
  if (authErr || !uid || !email) return fail(401, "not_authenticated");
  if (!allow(`card:${uid}`, 6, 60_000)) return fail(429, "rate_limited");

  const b = (await req.json().catch(() => ({}))) as { product?: string; token?: string; paymentMethodId?: string; issuerId?: string | number; identification?: { type?: string; number?: string }; recipient?: string };
  const item = itemForProduct(String(b.product ?? ""));
  if (!item) return fail(400, "invalid_product");
  const token = String(b.token ?? "");
  const method = String(b.paymentMethodId ?? "");
  if (!/^[A-Za-z0-9]{20,64}$/.test(token) || !/^[a-z0-9_]{2,30}$/.test(method)) return fail(400, "invalid_card");
  const issuer = String(b.issuerId ?? "");
  const idType = String(b.identification?.type ?? "");
  const idNumber = String(b.identification?.number ?? "").replace(/\D/g, "");

  let recipientId: string | undefined;
  if (item.kind === "plus") {
    const { data: sub } = await adminClient().from("subscriptions").select("status").eq("user_id", uid).maybeSingle();
    if (sub?.status === "authorized") return fail(409, "already_subscribed");
  }
  if (item.kind === "gift") {
    const g = await giftRecipient(uid, String(b.recipient ?? ""));
    if (g.reason || !g.id) return fail(409, `gift_${g.reason ?? "not_found"}`);
    recipientId = g.id;
  }

  const r = await mp<{ id?: number; status?: string; status_detail?: string; message?: string }>("/v1/payments", {
    method: "POST",
    body: {
      transaction_amount: item.cents / 100,
      token,
      description: item.title,
      installments: 1,
      payment_method_id: method,
      ...(/^\d{1,8}$/.test(issuer) ? { issuer_id: Number(issuer) } : {}),
      payer: { email, ...(idType && idNumber ? { identification: { type: idType.slice(0, 10), number: idNumber.slice(0, 20) } } : {}) },
      external_reference: refFor(uid, item, recipientId),
      notification_url: `${SITE_URL}/api/pay/webhook`,
      statement_descriptor: "PINZ",
    },
  });
  if (!r.ok || !r.data.id) return NextResponse.json({ status: "rejected", message: reason(String(r.data.message ?? "")) }, { status: r.status === 400 ? 200 : 502 });

  const status = r.data.status ?? "pending";
  if (status === "approved") await applyPayment({ buyer: uid, item, recipient: recipientId }, String(r.data.id), "approved");
  return NextResponse.json({ status, id: String(r.data.id), message: status === "rejected" ? reason(String(r.data.status_detail ?? "")) : null });
}
