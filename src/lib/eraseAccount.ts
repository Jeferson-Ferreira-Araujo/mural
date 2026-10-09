import { adminClient } from "@/lib/mercadopago";

/** Caminho do arquivo dentro do bucket pin-media a partir do endereço público guardado no pin. */
const mediaPath = (src: unknown) => (typeof src === "string" ? src.split("/object/public/pin-media/")[1] : undefined);

/**
 * Apaga DE VEZ uma conta e tudo que é dela: arquivos (foto de perfil e mídia dos pins que ela deixou ou que estão nos murais dela),
 * os recados que ela deixou em murais de outros e, por fim, a conta (que leva em cascata murais, bottons, créditos, acessos e avisos).
 * Os registros de pagamento ficam sem vínculo com a pessoa. Só roda no servidor.
 */
export async function eraseAccount(uid: string): Promise<boolean> {
  const admin = adminClient();
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
  await admin.from("messages").delete().eq("author_id", uid);
  const { error } = await admin.auth.admin.deleteUser(uid);
  return !error;
}
