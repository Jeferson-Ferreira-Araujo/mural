import { NextResponse } from "next/server";
import { applyPayment, parseRef } from "@/lib/payCatalog";
import { adminClient, isUuid } from "@/lib/mercadopago";
import { isCurrency, priceIn, type Currency } from "@/lib/money";
import { PLUS_PRICE_CENTS } from "@/lib/plans";
import { stripeApi, stripeConfigured, verifyStripeSignature } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ok = () => NextResponse.json({ received: true });
type Obj = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Marca a moeda em que o pagamento foi cobrado (o banco guarda reais por padrão). */
async function markCurrency(paymentId: string, currency: Currency) {
  await adminClient().from("payments").update({ currency }).eq("mp_payment_id", paymentId);
}

/** Valor esperado (centavos) de um preço em reais, na moeda cobrada: em reais é o próprio preço, em dólares vem da tabela. */
const expected = priceIn;
const asCurrency = (c: string): Currency | null => (isCurrency(c.toUpperCase()) ? (c.toUpperCase() as Currency) : null);

/** Compra única paga: confere o valor em dólar e aplica (créditos ou PINZ+), do mesmo jeito do Mercado Pago. */
async function applyOnce(ref: string, paymentId: string, amount: number, currency: string, status: string): Promise<boolean> {
  const parsed = parseRef(ref);
  if (!parsed) return true; // não é uma compra nossa
  const cur = asCurrency(currency);
  if (!cur) return true; // moeda que não vendemos: ignora
  const price = expected(parsed.item.cents, cur);
  if (amount !== price) return true; // valor diferente do preço do item: ignora
  const ok = await applyPayment({ ...parsed, item: { ...parsed.item, cents: price } }, paymentId, status, cur);
  if (ok) await markCurrency(paymentId, cur);
  return ok;
}

/** Assinatura mensal: renova (ou cancela) o PINZ+ e registra a cobrança no extrato. */
async function syncSubscription(uid: string, subId: string, status: "authorized" | "cancelled", paidUntil: string | null, invoiceId?: string, amount?: number, currency: Currency = "USD") {
  const db = adminClient();
  const { error } = await db.rpc("pay_plus_apply", { p_user: uid, p_preapproval: `stripe:${subId}`, p_status: status, p_paid_until: paidUntil });
  if (error) return false;
  if (invoiceId && amount !== undefined) {
    const pid = `stripe:inv:${invoiceId}`;
    await db.rpc("pay_record", { p_user: uid, p_kind: "plus", p_payment: pid, p_cents: amount, p_status: "approved" });
    await markCurrency(pid, currency);
  }
  return true;
}

async function subscriptionUid(subId: string): Promise<string | null> {
  const r = await stripeApi<{ metadata?: { ref?: string } }>(`/v1/subscriptions/${encodeURIComponent(subId)}`);
  const ref = r.ok ? str(r.data.metadata?.ref) : "";
  return isUuid(ref) ? ref : null;
}

/**
 * Avisos da Stripe. O corpo só vale se a assinatura (Stripe-Signature) bater com o segredo do webhook; mesmo assim os valores são conferidos
 * contra os preços do servidor. Responder 5xx faz a Stripe tentar de novo. Eventos que não interessam respondem 200.
 */
export async function POST(req: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"))) return NextResponse.json({ error: "bad_signature" }, { status: 400 });

  let event: { type?: string; data?: { object?: Obj } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const o = (event.data?.object ?? {}) as Obj;

  try {
    switch (event.type) {
      case "checkout.session.async_payment_succeeded": // Pix e outros meios que confirmam depois
      case "checkout.session.completed": {
        // compra única: o pagamento já veio junto. Assinatura: quem aplica é o invoice.paid
        if (o.mode !== "payment") return ok();
        const ref = str((o.metadata as Obj | undefined)?.ref) || str(o.client_reference_id);
        const status = o.payment_status === "paid" ? "approved" : "pending";
        const done = await applyOnce(ref, `stripe:${str(o.payment_intent) || str(o.id)}`, Number(o.amount_total ?? 0), str(o.currency), status);
        return done ? ok() : NextResponse.json({ error: "db" }, { status: 500 });
      }
      case "invoice.paid": {
        const subId = str(o.subscription) || str(((o.parent as Obj | undefined)?.subscription_details as Obj | undefined)?.subscription);
        if (!subId) return ok();
        const uid = await subscriptionUid(subId);
        if (!uid) return ok();
        const cur = asCurrency(str(o.currency));
        if (!cur || Number(o.amount_paid ?? 0) !== expected(PLUS_PRICE_CENTS, cur)) return ok();
        const end = Number((((o.lines as Obj | undefined)?.data as Obj[] | undefined)?.[0]?.period as Obj | undefined)?.end ?? 0);
        const until = end ? new Date(end * 1000).toISOString() : new Date(Date.now() + 31 * 86_400_000).toISOString();
        return (await syncSubscription(uid, subId, "authorized", until, str(o.id), Number(o.amount_paid), cur)) ? ok() : NextResponse.json({ error: "db" }, { status: 500 });
      }
      case "customer.subscription.deleted": {
        const uid = (isUuid(str((o.metadata as Obj | undefined)?.ref)) ? str((o.metadata as Obj).ref) : null) ?? null;
        if (!uid) return ok();
        return (await syncSubscription(uid, str(o.id), "cancelled", null)) ? ok() : NextResponse.json({ error: "db" }, { status: 500 });
      }
      case "charge.refunded": {
        const ref = str((o.metadata as Obj | undefined)?.ref);
        const pi = str(o.payment_intent);
        if (!ref || !pi || o.refunded !== true) return ok();
        const done = await applyOnce(ref, `stripe:${pi}`, Number(o.amount ?? 0), str(o.currency), "refunded");
        return done ? ok() : NextResponse.json({ error: "db" }, { status: 500 });
      }
    }
  } catch {
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
  return ok();
}
