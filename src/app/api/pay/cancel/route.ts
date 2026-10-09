import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { adminClient, mp, paymentsConfigured, syncPreapproval } from "@/lib/mercadopago";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Cancela a assinatura PINZ+ da própria conta. O PINZ+ continua até o fim do período já pago. */
export async function POST(req: Request) {
  if (!paymentsConfigured()) return fail(503, "unavailable");
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return fail(401, "not_authenticated");
  const { data: u, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }).auth.getUser(jwt);
  const uid = u.user?.id;
  if (authErr || !uid) return fail(401, "not_authenticated");
  if (!allow(`paycancel:${uid}`, 5, 60_000)) return fail(429, "rate_limited");

  const { data: sub } = await adminClient().from("subscriptions").select("mp_preapproval_id, status").eq("user_id", uid).maybeSingle();
  if (!sub?.mp_preapproval_id) return fail(404, "no_subscription");
  const r = await mp(`/preapproval/${encodeURIComponent(sub.mp_preapproval_id)}`, { method: "PUT", body: { status: "cancelled" } });
  if (!r.ok) return fail(502, "provider_error");
  await syncPreapproval(sub.mp_preapproval_id);
  return NextResponse.json({ ok: true });
}
