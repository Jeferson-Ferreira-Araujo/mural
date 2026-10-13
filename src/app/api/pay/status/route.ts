import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { applyPayment, parseRef } from "@/lib/payCatalog";
import { mp, paymentsConfigured } from "@/lib/mercadopago";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Situação de um pagamento da própria conta (a tela do Pix pergunta a cada poucos segundos).
 * Só devolve pagamentos que pertencem a quem pergunta. Se já estiver aprovado, garante o efeito agora (a mesma conta do webhook, que nunca soma duas vezes).
 */
export async function GET(req: Request) {
  if (!(await paymentsConfigured())) return fail(503, "unavailable");
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return fail(401, "not_authenticated");
  const { data: u, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }).auth.getUser(jwt);
  const uid = u.user?.id;
  if (authErr || !uid) return fail(401, "not_authenticated");
  if (!allow(`paystatus:${uid}`, 60, 60_000)) return fail(429, "rate_limited");

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^\d{4,20}$/.test(id)) return fail(400, "invalid_id");
  const r = await mp<{ id?: number; status?: string; external_reference?: string; transaction_amount?: number; currency_id?: string }>(`/v1/payments/${id}`);
  if (!r.ok) return NextResponse.json({ status: "unknown" });
  const parsed = parseRef(r.data.external_reference);
  if (!parsed || parsed.buyer !== uid) return fail(403, "forbidden");
  const status = r.data.status ?? "pending";
  if (status === "approved" && r.data.currency_id === "BRL" && Math.round((r.data.transaction_amount ?? 0) * 100) === parsed.item.cents) {
    await applyPayment(parsed, String(r.data.id ?? id), "approved");
  }
  return NextResponse.json({ status });
}
