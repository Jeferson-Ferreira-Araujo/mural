import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { adminClient, mpEither, paymentsConfigured, syncPreapproval } from "@/lib/mercadopago";
import { logServerError } from "@/lib/logError";
import { allow } from "@/lib/rateLimit";
import { stripeApi } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Cancela a assinatura PINZ+ da própria conta. O PINZ+ continua até o fim do período já pago. */
export async function POST(req: Request) {
  if (!(await paymentsConfigured())) return fail(503, "unavailable");
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return fail(401, "not_authenticated");
  const { data: u, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }).auth.getUser(jwt);
  const uid = u.user?.id;
  if (authErr || !uid) return fail(401, "not_authenticated");
  if (!allow(`paycancel:${uid}`, 5, 60_000)) return fail(429, "rate_limited");

  const { data: sub } = await adminClient().from("subscriptions").select("mp_preapproval_id, status").eq("user_id", uid).maybeSingle();
  if (!sub?.mp_preapproval_id) return fail(404, "no_subscription");
  if (sub.mp_preapproval_id.startsWith("stripe:")) {
    // assinatura em dólar (Stripe): não renova; o PINZ+ vale até o fim do período já pago
    const r = await stripeApi(`/v1/subscriptions/${encodeURIComponent(sub.mp_preapproval_id.slice(7))}`, { method: "POST", body: { cancel_at_period_end: true } });
    if (!r.ok) { await logServerError("pay.cancel", "o Mercado Pago ou a Stripe recusou a chamada"); return fail(502, "provider_error"); }
    await adminClient().rpc("pay_plus_apply", { p_user: uid, p_preapproval: sub.mp_preapproval_id, p_status: "cancelled", p_paid_until: null });
    return NextResponse.json({ ok: true });
  }
  const r = await mpEither(`/preapproval/${encodeURIComponent(sub.mp_preapproval_id)}`, { method: "PUT", body: { status: "cancelled" } });
  if (!r.ok) { await logServerError("pay.cancel", "o Mercado Pago ou a Stripe recusou a chamada"); return fail(502, "provider_error"); }
  await syncPreapproval(sub.mp_preapproval_id, r.env);
  return NextResponse.json({ ok: true });
}
