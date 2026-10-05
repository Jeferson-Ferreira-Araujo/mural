import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { fetchReport, missingConfig } from "@/lib/ga";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Números do Google Analytics para o painel de administração. Só administradores (conferido no banco com o login de quem chama). */
export async function GET(req: Request) {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt || !SUPABASE_URL) return fail(401, "not_authenticated");
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
  const { data: u, error: authErr } = await sb.auth.getUser(jwt);
  if (authErr || !u.user) return fail(401, "not_authenticated");
  const { data: isAdmin } = await sb.rpc("is_admin");
  if (isAdmin !== true) return fail(403, "forbidden");

  const missing = missingConfig();
  if (missing.length > 0) return NextResponse.json({ configured: false, missing });

  const days = new URL(req.url).searchParams.get("days") === "30" ? 30 : 7;
  try {
    return NextResponse.json(await fetchReport(days));
  } catch {
    return fail(502, "upstream");
  }
}
