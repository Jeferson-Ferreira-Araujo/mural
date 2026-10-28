import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { adminClient } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Usuários excluídos pelo administrador que ainda podem ser restaurados (dentro dos 7 dias). */
export async function GET(req: Request) {
  const who = await requireAdmin(req);
  if (typeof who !== "string") return who;
  const { data } = await adminClient().from("deleted_users_backup").select("id, email, nickname, deleted_at, expires_at, data").gt("expires_at", new Date().toISOString()).order("deleted_at", { ascending: false });
  const rows = (data ?? []).map((r) => {
    const d = (r.data ?? {}) as Record<string, unknown[]>;
    return { id: r.id, email: r.email, nickname: r.nickname, deletedAt: r.deleted_at, expiresAt: r.expires_at, murals: d.murals?.length ?? 0, pins: d.messages?.length ?? 0 };
  });
  return NextResponse.json({ rows });
}
