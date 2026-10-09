import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.CRON_SECRET ?? "";

/**
 * Rotina frequente (agendada no servidor): apaga do armazenamento os arquivos de pins que já não existem
 * (pin excluído, recusado, denunciado, mural ou conta apagados). Exige o segredo CRON_SECRET.
 */
export async function POST(req: Request) {
  const given = Buffer.from(req.headers.get("x-cron-secret") ?? "");
  const want = Buffer.from(SECRET);
  if (!SECRET || given.length !== want.length || !timingSafeEqual(given, want)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = adminClient();
  let removed = 0;
  for (let round = 0; round < 5; round++) {
    const { data, error } = await admin.rpc("orphan_media", { p_limit: 200 });
    const names = Array.isArray(data) ? (data as string[]) : [];
    if (error || names.length === 0) break;
    const { error: rmErr } = await admin.storage.from("pin-media").remove(names);
    if (rmErr) break;
    removed += names.length;
  }
  return NextResponse.json({ ok: true, removidos: removed });
}
