import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { adminClient, mp, paymentsConfigured } from "@/lib/mercadopago";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Pede a exclusão da PRÓPRIA conta. A conta fica DESATIVADA (escondida de todos) por 30 dias: se a pessoa entrar de novo nesse prazo,
 * ela volta como estava. Passado o prazo, uma rotina diária (/api/account/purge) apaga tudo de vez.
 * A assinatura PINZ+ é cancelada já (para não cobrar mais). Contas de administrador não podem se excluir por aqui.
 */
export async function POST(req: Request) {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt || !SUPABASE_URL) return fail(401, "not_authenticated");
  const { data: u, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }).auth.getUser(jwt);
  const uid = u.user?.id;
  if (authErr || !uid) return fail(401, "not_authenticated");
  if (!allow(`delacct:${uid}`, 5, 3_600_000)) return fail(429, "rate_limited");

  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "EXCLUIR") return fail(400, "not_confirmed");

  const admin = adminClient();
  const { data: isAdmin } = await admin.from("admins").select("user_id").eq("user_id", uid).maybeSingle();
  if (isAdmin) return fail(403, "admin");

  try {
    if (paymentsConfigured()) {
      const { data: sub } = await admin.from("subscriptions").select("mp_preapproval_id").eq("user_id", uid).maybeSingle();
      if (sub?.mp_preapproval_id) await mp(`/preapproval/${encodeURIComponent(sub.mp_preapproval_id)}`, { method: "PUT", body: { status: "cancelled" } });
    }
    // desativa: o perfil some para todos (as consultas já ignoram perfis bloqueados) e fica marcado com a data
    const now = new Date().toISOString();
    const { error } = await admin.from("profiles").update({ banned: true, ban_reason: "Conta excluída pela própria pessoa", banned_at: now, deleted_at: now }).eq("user_id", uid);
    if (error) return fail(500, "delete_failed");
    return NextResponse.json({ ok: true });
  } catch {
    return fail(500, "delete_failed");
  }
}
