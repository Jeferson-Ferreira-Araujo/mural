import { NextResponse } from "next/server";
import { fail, requireAdmin } from "@/lib/adminAuth";
import { eraseAccount } from "@/lib/eraseAccount";
import { adminClient } from "@/lib/mercadopago";
import { backupUser } from "@/lib/userBackup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exclui a conta de um usuário (sem os 30 dias de espera), mas antes guarda tudo (dados e arquivos) por 7 dias, para poder restaurar.
 * Se a cópia falhar, nada é apagado. Corpo: { userId }. Não vale para administradores.
 */
export async function POST(req: Request) {
  const who = await requireAdmin(req);
  if (typeof who !== "string") return who;
  const body = (await req.json().catch(() => ({}))) as { userId?: string };
  const uid = body.userId;
  if (!uid || !/^[0-9a-f-]{36}$/i.test(uid)) return fail(400, "invalid_user");
  if (uid === who) return fail(409, "self");
  const admin = adminClient();
  const { data: target } = await admin.from("admins").select("user_id").eq("user_id", uid).maybeSingle();
  if (target) return fail(409, "is_admin");
  const { data: u } = await admin.auth.admin.getUserById(uid);
  if (!u?.user) return fail(404, "not_found");
  const backup = await backupUser(uid, u.user.email ?? null, who);
  if (!backup) return fail(500, "backup_failed");
  if (!(await eraseAccount(uid))) return fail(500, "erase_failed");
  return NextResponse.json({ ok: true, backup });
}
