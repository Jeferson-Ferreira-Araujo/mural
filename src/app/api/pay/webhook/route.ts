import { NextResponse } from "next/server";
import { applyPayment, notifyPlus, parseRef } from "@/lib/payCatalog";
import { adminClient, envConfigured, isUuid, mp, syncPreapproval, webhookEnv } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ok = () => NextResponse.json({ ok: true });

/**
 * Avisos do Mercado Pago. Nada que vem no aviso é confiado: pegamos só o tipo e o número e CONSULTAMOS o Mercado Pago
 * (com o nosso token) para saber o que de fato aconteceu. Responder 5xx faz o Mercado Pago tentar de novo.
 */
async function handle(req: Request) {
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string | number } };
  const type = String(body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "");
  const id = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  if (!id || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) return ok();
  const env = await webhookEnv(req, id); // de qual ambiente (teste ou produção) é este aviso: ele é consultado com o token do próprio ambiente
  if (!env) return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  if (!envConfigured(env)) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  try {
    if (type === "payment") {
      const r = await mp<{ id?: number; status?: string; external_reference?: string; transaction_amount?: number; currency_id?: string }>(`/v1/payments/${id}`, undefined, env);
      if (!r.ok) return NextResponse.json({ error: "lookup_failed" }, { status: r.status === 404 ? 200 : 502 });
      // cobranças da assinatura mensal também geram "payment": a referência delas é só o id da conta (sem ":"), tratadas pelo aviso da assinatura
      const parsed = parseRef(r.data.external_reference);
      if (!parsed) return ok();
      // o valor pago tem que ser exatamente o preço do item
      if (r.data.currency_id !== "BRL" || Math.round((r.data.transaction_amount ?? 0) * 100) !== parsed.item.cents) return ok();
      const applied = await applyPayment(parsed, String(r.data.id ?? id), r.data.status ?? "pending");
      return applied ? ok() : NextResponse.json({ error: "db" }, { status: 500 });
    }

    if (type === "subscription_preapproval" || type === "preapproval") {
      const sync = await syncPreapproval(id, env);
      return sync.ok || sync.notFound ? ok() : NextResponse.json({ error: "lookup_failed" }, { status: 502 });
    }

    if (type === "subscription_authorized_payment") {
      const r = await mp<{ preapproval_id?: string; status?: string; transaction_amount?: number }>(`/authorized_payments/${id}`, undefined, env);
      if (!r.ok) return NextResponse.json({ error: "lookup_failed" }, { status: r.status === 404 ? 200 : 502 });
      if (!r.data.preapproval_id) return ok();
      const sync = await syncPreapproval(r.data.preapproval_id, env);
      if (sync.notFound) return ok();
      if (!sync.ok) return NextResponse.json({ error: "lookup_failed" }, { status: 502 });
      // cada mensalidade fica registrada (aparece no extrato do usuário e no admin)
      if (sync.uid) {
        const status = r.data.status === "processed" ? "approved" : (r.data.status ?? "pending");
        const cents = Math.round((r.data.transaction_amount ?? 0) * 100);
        await adminClient().rpc("pay_record", { p_user: sync.uid, p_kind: "plus", p_payment: `sub:${id}`, p_cents: cents, p_status: status });
        if (status === "approved") await notifyPlus(sync.uid, "paid", `sub:${id}`, "BRL", cents);
        else if (r.data.status === "rejected") await notifyPlus(sync.uid, "failed", `sub:${id}`, "BRL");
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
