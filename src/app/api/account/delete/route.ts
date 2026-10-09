import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { adminClient, mp, paymentsConfigured } from "@/lib/mercadopago";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Caminho do arquivo dentro do bucket pin-media a partir do endereço público guardado no pin. */
const mediaPath = (src: unknown) => (typeof src === "string" ? src.split("/object/public/pin-media/")[1] : undefined);

/**
 * Exclui a PRÓPRIA conta e tudo que é dela: murais e pins (os recados que a pessoa deixou em murais de outros também),
 * arquivos enviados, bottons, créditos e acessos. Cancela a assinatura PLUS, se houver. Os registros de pagamento ficam sem vínculo
 * com a pessoa (a lei pode exigir guardá-los). Não tem volta. Contas de administrador não podem se excluir por aqui.
 */
export async function POST(req: Request) {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt || !SUPABASE_URL) return fail(401, "not_authenticated");
  const { data: u, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }).auth.getUser(jwt);
  const uid = u.user?.id;
  if (authErr || !uid) return fail(401, "not_authenticated");
  if (!allow(`delacct:${uid}`, 3, 3_600_000)) return fail(429, "rate_limited");

  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "EXCLUIR") return fail(400, "not_confirmed");

  const admin = adminClient();
  const { data: isAdmin } = await admin.from("admins").select("user_id").eq("user_id", uid).maybeSingle();
  if (isAdmin) return fail(403, "admin");

  try {
    // 1) assinatura PLUS: cancela para não cobrar mais
    if (paymentsConfigured()) {
      const { data: sub } = await admin.from("subscriptions").select("mp_preapproval_id").eq("user_id", uid).maybeSingle();
      if (sub?.mp_preapproval_id) await mp(`/preapproval/${encodeURIComponent(sub.mp_preapproval_id)}`, { method: "PUT", body: { status: "cancelled" } });
    }

    // 2) arquivos: foto de perfil e a mídia dos pins que a pessoa deixou OU que estão nos murais dela
    const { data: murals } = await admin.from("murals").select("id").eq("owner_id", uid);
    const muralIds = (murals ?? []).map((m) => m.id as string);
    const { data: mine } = await admin.from("messages").select("content").eq("author_id", uid);
    const { data: inMine } = muralIds.length ? await admin.from("messages").select("content").in("mural_id", muralIds) : { data: [] as { content: Record<string, unknown> }[] };
    const files = new Set<string>();
    for (const row of [...(mine ?? []), ...(inMine ?? [])]) {
      const p = mediaPath((row.content as Record<string, unknown>)?.src);
      if (p) files.add(p);
    }
    if (files.size > 0) await admin.storage.from("pin-media").remove([...files]);
    const { data: avatars } = await admin.storage.from("avatars").list(uid, { limit: 100 });
    if (avatars?.length) await admin.storage.from("avatars").remove(avatars.map((f) => `${uid}/${f.name}`));
    const { data: own } = await admin.storage.from("pin-media").list(uid, { limit: 1000 });
    if (own?.length) await admin.storage.from("pin-media").remove(own.map((f) => `${uid}/${f.name}`));

    // 3) os recados que a pessoa deixou em murais de outros (os murais dela caem junto com a conta)
    await admin.from("messages").delete().eq("author_id", uid);

    // 4) a conta (apaga em cascata perfil, murais, bottons, créditos, acessos e notificações)
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) return fail(500, "delete_failed");
    return NextResponse.json({ ok: true });
  } catch {
    return fail(500, "delete_failed");
  }
}
