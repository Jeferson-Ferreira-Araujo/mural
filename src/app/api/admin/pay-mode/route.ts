import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { envConfigured, payMode, setPayMode, type PayEnv } from "@/lib/mercadopago";

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

const status = async () => ({ mode: await payMode(true), configured: { test: envConfigured("test"), live: envConfigured("live") } });

/** Ambiente de pagamentos em uso (teste ou produção) e quais ambientes têm credenciais no servidor. */
export async function GET(req: Request) {
  const who = await admin(req);
  if (typeof who !== "string") return who;
  return NextResponse.json(await status());
}

/** Troca o ambiente de pagamentos. Corpo: { mode: "test" | "live" }. Produção só se o servidor tiver o token de produção. */
export async function POST(req: Request) {
  const who = await admin(req);
  if (typeof who !== "string") return who;
  const body = (await req.json().catch(() => ({}))) as { mode?: string };
  const mode: PayEnv | null = body.mode === "live" ? "live" : body.mode === "test" ? "test" : null;
  if (!mode) return fail(400, "invalid_mode");
  if (!envConfigured(mode)) return fail(409, "not_configured");
  if (!(await setPayMode(mode, who))) return fail(500, "save_failed");
  return NextResponse.json(await status());
}
