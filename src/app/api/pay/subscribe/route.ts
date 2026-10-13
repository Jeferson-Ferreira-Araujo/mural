import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { PLUS_PRICE_CENTS } from "@/lib/plans";
import { adminClient, mp, paymentsConfigured, payMode, SITE_URL, syncPreapproval } from "@/lib/mercadopago";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Assinatura do PINZ+ dentro do Pinz: recebe só o CÓDIGO do cartão (gerado pelo Mercado Pago no navegador) e cria a assinatura mensal já autorizada.
 * O valor vem SEMPRE de lib/plans. O estado da assinatura é gravado agora e confirmado de novo pelo aviso (webhook) do Mercado Pago.
 * Corpo: { token, paymentMethodId }
 */
export async function POST(req: Request) {
  if (!(await paymentsConfigured())) return fail(503, "unavailable");
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return fail(401, "not_authenticated");
  const { data: u, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }).auth.getUser(jwt);
  const uid = u.user?.id;
  const email = u.user?.email;
  if (authErr || !uid || !email) return fail(401, "not_authenticated");
  if (!allow(`sub:${uid}`, 5, 60_000)) return fail(429, "rate_limited");

  const b = (await req.json().catch(() => ({}))) as { token?: string };
  const token = String(b.token ?? "");
  if (!/^[A-Za-z0-9]{20,64}$/.test(token)) return fail(400, "invalid_card");

  const { data: sub } = await adminClient().from("subscriptions").select("status").eq("user_id", uid).maybeSingle();
  if (sub?.status === "authorized") return fail(409, "already_subscribed");
  const { data: once } = await adminClient().from("subscriptions").select("status, paid_until").eq("user_id", uid).maybeSingle();
  if (once?.status === "once" && once.paid_until && new Date(once.paid_until).getTime() > Date.now()) return fail(409, "already_plus_once"); // anual ou vitalício ainda valendo

  const r = await mp<{ id?: string; status?: string; message?: string }>("/preapproval", {
    method: "POST",
    body: {
      reason: "Pinz PINZ+ (mensal)",
      external_reference: uid,
      payer_email: email,
      card_token_id: token,
      back_url: `${SITE_URL}/pagamento?produto=plus`,
      status: "authorized",
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: PLUS_PRICE_CENTS / 100, currency_id: "BRL" },
    },
  });
  if (!r.ok || !r.data.id) {
    // o Mercado Pago recusou o cartão ou a assinatura (400): mostra uma mensagem simples
    return NextResponse.json({ status: "rejected", message: "A assinatura foi recusada. Confira os dados ou tente outro cartão." }, { status: r.status >= 500 ? 502 : 200 });
  }

  const env = await payMode();
  await syncPreapproval(r.data.id, env); // grava já o estado (PINZ+ ativo) sem esperar o aviso
  const status = r.data.status ?? "pending";
  return NextResponse.json({ status: status === "authorized" ? "approved" : status === "pending" ? "pending" : "rejected", message: status === "authorized" || status === "pending" ? null : "A assinatura não foi autorizada. Tente outro cartão." });
}
