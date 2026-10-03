import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET = process.env.AVATAR_SIGNING_SECRET ?? "";
const NSFW_URL = process.env.NSFW_URL ?? "http://nsfw-check:8080";
const MAX_BYTES = 1024 * 1024; // igual ao limite do armazenamento
const APPROVAL_TTL_S = 120;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Verifica uma foto de perfil já enviada ao armazenamento: roda o detector de nudez (nosso servidor, gratuito) e,
 * só se a foto passar, devolve uma aprovação ASSINADA que o banco exige para aceitar a foto no perfil.
 * Reprovada ou ilegível: o arquivo é apagado e nenhuma aprovação é emitida. Detector fora do ar: nunca aprova.
 */
export async function POST(req: Request) {
  if (!SECRET || !SUPABASE_URL) return fail(503, "unavailable");

  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return fail(401, "not_authenticated");
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
  const { data: u, error: authErr } = await sb.auth.getUser(jwt);
  const uid = u.user?.id;
  if (authErr || !uid) return fail(401, "not_authenticated");

  const body = (await req.json().catch(() => null)) as { path?: unknown } | null;
  const path = typeof body?.path === "string" ? body.path : "";
  // o arquivo precisa estar na pasta do próprio usuário
  if (!new RegExp(`^${uid}/[A-Za-z0-9._-]{1,80}$`).test(path)) return fail(400, "invalid_path");

  // lê a imagem pelo próprio armazenamento (com a permissão do usuário)
  const { data: file, error: dlErr } = await sb.storage.from("avatars").download(path);
  if (dlErr || !file) return fail(404, "not_found");
  if (file.size > MAX_BYTES) {
    await sb.storage.from("avatars").remove([path]);
    return fail(413, "too_large");
  }
  const bytes = Buffer.from(await file.arrayBuffer());

  let verdict: { safe?: boolean } | null = null;
  try {
    const r = await fetch(`${NSFW_URL}/check`, { method: "POST", body: bytes, headers: { "Content-Type": "application/octet-stream" }, signal: AbortSignal.timeout(20_000) });
    if (r.status === 422) {
      await sb.storage.from("avatars").remove([path]);
      return fail(422, "unreadable");
    }
    if (r.ok) verdict = await r.json();
  } catch {
    /* detector indisponível: cai no 503 abaixo */
  }
  if (!verdict) return fail(503, "checker_unavailable"); // fail closed: sem verificação, sem aprovação

  if (!verdict.safe) {
    await sb.storage.from("avatars").remove([path]);
    return fail(422, "nsfw");
  }

  const exp = Math.floor(Date.now() / 1000) + APPROVAL_TTL_S;
  const sig = createHmac("sha256", SECRET).update(`${uid}|${path}|${exp}`).digest("hex");
  return NextResponse.json({ path, exp, sig });
}
