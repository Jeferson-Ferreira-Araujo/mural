import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/mercadopago";
import { eraseAccount } from "@/lib/eraseAccount";
import { purgeExpiredBackups } from "@/lib/userBackup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.CRON_SECRET ?? "";
const GRACE_DAYS = 30;

/** Rotina diária (agendada no servidor): apaga de vez as contas desativadas há mais de 30 dias. Exige o segredo CRON_SECRET. */
export async function POST(req: Request) {
  const given = Buffer.from(req.headers.get("x-cron-secret") ?? "");
  const want = Buffer.from(SECRET);
  if (!SECRET || given.length !== want.length || !timingSafeEqual(given, want)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const limit = new Date(Date.now() - GRACE_DAYS * 86_400_000).toISOString();
  const { data } = await adminClient().from("profiles").select("user_id").not("deleted_at", "is", null).lt("deleted_at", limit).limit(20);
  let done = 0;
  for (const r of data ?? []) if (await eraseAccount(r.user_id as string)) done++;
  const backups = await purgeExpiredBackups(); // cópias de excluídos pelo admin: vencem em 7 dias
  return NextResponse.json({ ok: true, apagadas: done, copias_vencidas: backups });
}
