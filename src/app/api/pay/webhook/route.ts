import { NextResponse } from "next/server";
import { CREDIT_PACKS } from "@/lib/plans";
import { adminClient, isUuid, mp, paymentsConfigured, syncPreapproval, validSignature } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ok = () => NextResponse.json({ ok: true });

/**
 * Avisos do Mercado Pago. Nada que vem no aviso é confiado: pegamos só o tipo e o número e CONSULTAMOS o Mercado Pago
 * (com o nosso token) para saber o que de fato aconteceu. Responder 5xx faz o Mercado Pago tentar de novo.
 */
async function handle(req: Request) {
  if (!paymentsConfigured()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string | number } };
  const type = String(body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "");
  const id = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  if (!id || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) return ok();
  if (!validSignature(req, id)) return NextResponse.json({ error: "bad_signature" }, { status: 401 });

  try {
    if (type === "payment") {
      const r = await mp<{ id?: number; status?: string; external_reference?: string; transaction_amount?: number; currency_id?: string }>(`/v1/payments/${id}`);
      if (!r.ok) return NextResponse.json({ error: "lookup_failed" }, { status: r.status === 404 ? 200 : 502 });
      // cobranças da assinatura também geram "payment": a referência delas é só o id da conta (sem ":"), tratadas pelo aviso da assinatura
      const [uid, packId] = String(r.data.external_reference ?? "").split(":");
      const pack = CREDIT_PACKS.find((p) => p.id === packId);
      if (!isUuid(uid) || !pack) return ok();
      // o valor pago tem que ser exatamente o preço do pacote
      if (r.data.currency_id !== "BRL" || Math.round((r.data.transaction_amount ?? 0) * 100) !== pack.cents) return ok();
      const { error } = await adminClient().rpc("pay_credits_apply", { p_user: uid, p_payment: String(r.data.id ?? id), p_credits: pack.credits, p_cents: pack.cents, p_status: r.data.status ?? "pending" });
      return error ? NextResponse.json({ error: "db" }, { status: 500 }) : ok();
    }

    if (type === "subscription_preapproval" || type === "preapproval") {
      return (await syncPreapproval(id)).ok ? ok() : NextResponse.json({ error: "lookup_failed" }, { status: 502 });
    }

    if (type === "subscription_authorized_payment") {
      const r = await mp<{ preapproval_id?: string; status?: string; transaction_amount?: number }>(`/authorized_payments/${id}`);
      if (!r.ok) return NextResponse.json({ error: "lookup_failed" }, { status: r.status === 404 ? 200 : 502 });
      if (!r.data.preapproval_id) return ok();
      const sync = await syncPreapproval(r.data.preapproval_id);
      if (!sync.ok) return NextResponse.json({ error: "lookup_failed" }, { status: 502 });
      // cada mensalidade fica registrada (aparece no extrato do usuário e no admin)
      if (sync.uid) {
        const status = r.data.status === "processed" ? "approved" : (r.data.status ?? "pending");
        await adminClient().rpc("pay_record", { p_user: sync.uid, p_kind: "plus", p_payment: `sub:${id}`, p_cents: Math.round((r.data.transaction_amount ?? 0) * 100), p_status: status });
      }
      return ok();
    }
  } catch {
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
  return ok();
}

export const POST = handle;
export const GET = handle;
