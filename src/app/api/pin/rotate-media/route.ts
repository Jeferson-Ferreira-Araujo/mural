import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/mercadopago";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
/** Endereço público dos arquivos (o do armazenamento, não o domínio próprio do login: é o que o banco aceita nos pins, veja uploadMedia em pins.ts). */
const PUBLIC = "https://npylmcjxcosoytuhjrxu.supabase.co/storage/v1/object/public/pin-media/";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Troca o endereço do arquivo (foto, desenho, vídeo ou voz) de um pin: copia para um nome novo aleatório, grava o novo endereço no pin
 * e apaga o arquivo antigo. Chamada quando o segredo liga ou desliga: quem salvou o link de antes deixa de conseguir abrir o arquivo.
 * Só quem administra o pin (dono do mural ou participante do compartilhado) consegue; o banco confere.
 */
export async function POST(req: Request) {
  if (!SUPABASE_URL) return fail(503, "unavailable");
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return fail(401, "not_authenticated");
  const user = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: u, error: authErr } = await user.auth.getUser(jwt);
  const uid = u.user?.id;
  if (authErr || !uid) return fail(401, "not_authenticated");
  if (!allow(`pinrotate:${uid}`, 120, 60 * 60_000)) return fail(429, "rate_limited");

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail(400, "invalid_id");

  const { data: src, error } = await user.rpc("pin_media_for_manage", { p_id: id });
  if (error) return fail(403, "forbidden");
  if (typeof src !== "string" || !src.startsWith(PUBLIC)) return NextResponse.json({ ok: true, rotated: false }); // pin sem arquivo nosso

  const path = src.slice(PUBLIC.length);
  const m = /^([0-9a-f-]{36})\/[A-Za-z0-9._-]{1,80}\.([a-z0-9]{2,5})$/i.exec(path);
  if (!m) return NextResponse.json({ ok: true, rotated: false });
  const next = `${m[1]}/${randomUUID()}.${m[2].toLowerCase()}`;

  const admin = adminClient();
  const bucket = admin.storage.from("pin-media");
  const { error: cpErr } = await bucket.copy(path, next);
  if (cpErr) return fail(502, "copy_failed");
  const { data: swapped, error: swapErr } = await admin.rpc("swap_pin_media", { p_id: id, p_old: src, p_new: `${PUBLIC}${next}` });
  if (swapErr || swapped !== true) {
    await bucket.remove([next]); // o pin mudou no meio do caminho: desfaz a cópia
    return fail(409, "changed");
  }
  await bucket.remove([path]);
  return NextResponse.json({ ok: true, rotated: true });
}
