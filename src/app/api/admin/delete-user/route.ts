import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/mercadopago";
import { eraseAccount } from "@/lib/eraseAccount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Só administradores (conferido no banco com o login de quem chama). Devolve o id do admin. */
async function admin(req: Request): Promise<string | NextResponse> {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt || !SUPABASE_URL) return fail(401, "not_authenticated");
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
  const { data: u, error } = await sb.auth.getUser(jwt);
  if (error || !u.user) return fail(401, "not_authenticated");
  const { data: isAdmin } = await sb.rpc("is_admin");
  if (isAdmin !== true) return fail(403, "forbidden");
  return u.user.id;
}

/** Exclui DE VEZ a conta de um usuário (sem os 30 dias de espera): dados, arquivos e login. Corpo: { userId }. Não vale para administradores. */
export async function POST(req: Request) {
  const who = await admin(req);
  if (typeof who !== "string") return who;
  const body = (await req.json().catch(() => ({}))) as { userId?: string };
  const uid = body.userId;
  if (!uid || !/^[0-9a-f-]{36}$/i.test(uid)) return fail(400, "invalid_user");
  if (uid === who) return fail(409, "self");
  const { data: target } = await adminClient().from("admins").select("user_id").eq("user_id", uid).maybeSingle();
  if (target) return fail(409, "is_admin");
  if (!(await eraseAccount(uid))) return fail(500, "erase_failed");
  return NextResponse.json({ ok: true });
}
