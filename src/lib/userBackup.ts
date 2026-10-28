import { adminClient } from "@/lib/mercadopago";

/** Bucket privado onde ficam, por 7 dias, os arquivos de quem foi excluído pelo administrador. */
export const BACKUP_BUCKET = "deleted-backup";
export const BACKUP_DAYS = 7;

type FileRef = { bucket: string; path: string };

const mediaPath = (src: unknown) => (typeof src === "string" ? src.split("/object/public/pin-media/")[1] : undefined);

/** Lista os arquivos que pertencem à conta: foto de perfil, pasta de mídia e a mídia dos pins que ela deixou ou que estão nos murais dela. */
async function filesOf(uid: string, data: Record<string, unknown[]>): Promise<FileRef[]> {
  const admin = adminClient();
  const out = new Map<string, FileRef>();
  const add = (bucket: string, path: string) => out.set(`${bucket}/${path}`, { bucket, path });
  for (const m of (data.messages ?? []) as { content?: Record<string, unknown> }[]) {
    const p = mediaPath(m.content?.src);
    if (p) add("pin-media", p);
  }
  const { data: av } = await admin.storage.from("avatars").list(uid, { limit: 100 });
  for (const f of av ?? []) add("avatars", `${uid}/${f.name}`);
  const { data: own } = await admin.storage.from("pin-media").list(uid, { limit: 1000 });
  for (const f of own ?? []) add("pin-media", `${uid}/${f.name}`);
  return [...out.values()];
}

const putBack = async (files: FileRef[]) => {
  const admin = adminClient();
  for (const f of files) await admin.storage.from(BACKUP_BUCKET).move(`${f.bucket}/${f.path}`, f.path, { destinationBucket: f.bucket });
};

/**
 * Guarda tudo da conta antes de apagar: os dados (tabela deleted_users_backup) e os arquivos (movidos para o bucket privado).
 * Devolve o id da cópia, ou null se algo falhou (nesse caso nada foi apagado e os arquivos já movidos voltam).
 */
export async function backupUser(uid: string, email: string | null, by: string): Promise<string | null> {
  const admin = adminClient();
  const { data: snap, error } = await admin.rpc("backup_user_snapshot", { p_uid: uid });
  if (error || !snap) return null;
  const { data: prof } = await admin.from("profiles").select("nickname").eq("user_id", uid).maybeSingle();
  const wanted = await filesOf(uid, snap as Record<string, unknown[]>);
  const moved: FileRef[] = [];
  for (const f of wanted) {
    const { error: e } = await admin.storage.from(f.bucket).move(f.path, `${f.bucket}/${f.path}`, { destinationBucket: BACKUP_BUCKET });
    if (e) {
      await putBack(moved);
      return null;
    }
    moved.push(f);
  }
  const { data: row, error: e2 } = await admin
    .from("deleted_users_backup")
    .insert({ user_id: uid, email, nickname: (prof?.nickname as string) ?? null, data: snap, files: moved, deleted_by: by, expires_at: new Date(Date.now() + BACKUP_DAYS * 86_400_000).toISOString() })
    .select("id")
    .single();
  if (e2 || !row) {
    await putBack(moved);
    return null;
  }
  return row.id as string;
}

/** Devolve a conta: recria o login com o mesmo id, restaura os dados e põe os arquivos de volta. A pessoa entra de novo por "esqueci minha senha". */
export async function restoreUser(backupId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = adminClient();
  const { data: b } = await admin.from("deleted_users_backup").select("*").eq("id", backupId).maybeSingle();
  if (!b) return { ok: false, error: "not_found" };
  const uid = b.user_id as string;
  const { error: ce } = await admin.auth.admin.createUser({ id: uid, email: b.email as string, email_confirm: true });
  if (ce) return { ok: false, error: /already|registered|exists/i.test(ce.message) ? "email_taken" : "create_failed" };
  const { error: re } = await admin.rpc("restore_user_snapshot", { p_backup: backupId });
  if (re) {
    await admin.auth.admin.deleteUser(uid);
    return { ok: false, error: /nickname|duplicate/i.test(re.message) ? "nickname_taken" : "restore_failed" };
  }
  await putBack((b.files ?? []) as FileRef[]);
  await admin.from("deleted_users_backup").delete().eq("id", backupId);
  return { ok: true };
}

/** Apaga de vez as cópias vencidas (arquivos e dados). Devolve quantas foram. */
export async function purgeExpiredBackups(): Promise<number> {
  const admin = adminClient();
  const { data } = await admin.from("deleted_users_backup").select("id, files").lt("expires_at", new Date().toISOString()).limit(20);
  for (const r of data ?? []) {
    const files = (r.files ?? []) as FileRef[];
    if (files.length) await admin.storage.from(BACKUP_BUCKET).remove(files.map((f) => `${f.bucket}/${f.path}`));
    await admin.from("deleted_users_backup").delete().eq("id", r.id as string);
  }
  return data?.length ?? 0;
}
