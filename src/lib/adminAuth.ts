import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Só administradores (conferido no banco com o login de quem chama). Devolve o id do admin ou a resposta de erro. */
export async function requireAdmin(req: Request): Promise<string | NextResponse> {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt || !SUPABASE_URL) return fail(401, "not_authenticated");
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
  const { data: u, error } = await sb.auth.getUser(jwt);
  if (error || !u.user) return fail(401, "not_authenticated");
  const { data: isAdmin } = await sb.rpc("is_admin");
  if (isAdmin !== true) return fail(403, "forbidden");
  return u.user.id;
}
