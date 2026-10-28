import { NextResponse } from "next/server";
import { fail, requireAdmin } from "@/lib/adminAuth";
import { restoreUser } from "@/lib/userBackup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Restaura um usuário excluído pelo administrador (dentro dos 7 dias). Corpo: { backupId }. */
export async function POST(req: Request) {
  const who = await requireAdmin(req);
  if (typeof who !== "string") return who;
  const body = (await req.json().catch(() => ({}))) as { backupId?: string };
  if (!body.backupId || !/^[0-9a-f-]{36}$/i.test(body.backupId)) return fail(400, "invalid_backup");
  const r = await restoreUser(body.backupId);
  return r.ok ? NextResponse.json({ ok: true }) : fail(r.error === "not_found" ? 404 : 409, r.error);
}
