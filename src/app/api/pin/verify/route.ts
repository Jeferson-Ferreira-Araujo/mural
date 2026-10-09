import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/mercadopago";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET = process.env.AVATAR_SIGNING_SECRET ?? "";
const NSFW_URL = process.env.NSFW_URL ?? "http://nsfw-check:8080";
const MAX_BYTES = 12 * 1024 * 1024;
const APPROVAL_TTL_S = 600;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Verifica uma foto/desenho de pin já enviado ao armazenamento: roda o detector de nudez (nosso servidor, gratuito) e,
 * só se a imagem passar, devolve uma aprovação ASSINADA que o banco exige para aceitar o pin (send_message).
 * Reprovada ou ilegível: o arquivo é apagado e nenhuma aprovação é emitida. Detector fora do ar: nunca aprova.
 */
export async function POST(req: Request) {
  if (!SECRET || !SUPABASE_URL) return fail(503, "unavailable");

  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return fail(401, "not_authenticated");
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data: u, error: authErr } = await sb.auth.getUser(jwt);
  const uid = u.user?.id;
  if (authErr || !uid) return fail(401, "not_authenticated");
  if (!allow(`pinverify:${uid}`, 40, 60 * 60_000)) return fail(429, "rate_limited");

  const body = (await req.json().catch(() => null)) as { path?: unknown } | null;
  const path = typeof body?.path === "string" ? body.path : "";
  if (!/^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,80}\.(jpg|png|webp|gif|heic)$/i.test(path)) return fail(400, "invalid_path");

  const admin = adminClient();
  const { data: file, error: dlErr } = await admin.storage.from("pin-media").download(path);
  if (dlErr || !file) return fail(404, "not_found");
  if (file.size > MAX_BYTES) {
    await admin.storage.from("pin-media").remove([path]);
    return fail(413, "too_large");
  }
  const bytes = Buffer.from(await file.arrayBuffer());

  let verdict: { safe?: boolean; flags?: string[]; detected?: string[]; nsfw_prob?: number } | null = null;
  try {
    const r = await fetch(`${NSFW_URL}/check`, { method: "POST", body: bytes, headers: { "Content-Type": "application/octet-stream" }, signal: AbortSignal.timeout(25_000) });
    if (r.status === 422) {
      await admin.storage.from("pin-media").remove([path]);
      return fail(422, "unreadable");
    }
    if (r.ok) verdict = await r.json();
  } catch {
    /* detector indisponível: cai no 503 abaixo */
  }
  if (!verdict) return fail(503, "checker_unavailable"); // sem verificação, sem aprovação

  if (!verdict.safe) {
    console.log("pin reprovado pelo detector:", verdict.flags?.join(","), "| classificador:", verdict.nsfw_prob, "| detectado:", verdict.detected?.join(","));
    await admin.storage.from("pin-media").remove([path]);
    return fail(422, "nsfw");
  }

  const exp = Math.floor(Date.now() / 1000) + APPROVAL_TTL_S;
  const sig = createHmac("sha256", SECRET).update(`${uid}|pin|${path}|${exp}`).digest("hex");
  return NextResponse.json({ exp, sig });
}
