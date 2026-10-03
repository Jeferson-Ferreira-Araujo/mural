import type { SupabaseClient } from "@supabase/supabase-js";

/** Lado (px) da foto de perfil depois do recorte. */
const SIZE = 512;
export const MAX_AVATAR_MB = 8;

/**
 * Recorta a foto em quadrado (pelo centro), reduz para 512 px e converte para WebP (ou JPEG se o navegador não gerar WebP).
 * Tudo no navegador: a foto original nunca é enviada, só a versão pequena (algumas dezenas de KB).
 */
export async function processAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  if (file.size > MAX_AVATAR_MB * 1024 * 1024) throw new Error(`A foto pode ter até ${MAX_AVATAR_MB} MB.`);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Não foi possível ler essa imagem. Tente uma foto JPG, PNG ou WebP.");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();

  const toBlob = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  const webp = await toBlob("image/webp", 0.85);
  const out = webp && webp.type === "image/webp" ? webp : await toBlob("image/jpeg", 0.88);
  if (!out) throw new Error("Não foi possível processar a imagem.");
  return out;
}

const publicUrl = (sb: SupabaseClient, path: string) => sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;

/** Foto atual do usuário logado (endereço público) e o caminho no armazenamento. */
export async function getOwnAvatar(sb: SupabaseClient): Promise<{ url: string | null; path: string | null }> {
  const { data } = await sb.from("profiles").select("avatar_path").maybeSingle();
  const path = (data as { avatar_path: string | null } | null)?.avatar_path ?? null;
  return { url: path ? publicUrl(sb, path) : null, path };
}

/** Apaga as fotos antigas da pasta do usuário (menos a indicada). */
async function cleanOld(sb: SupabaseClient, uid: string, keep: string | null) {
  const { data } = await sb.storage.from("avatars").list(uid, { limit: 20 });
  const old = (data ?? []).map((f) => `${uid}/${f.name}`).filter((p) => p !== keep);
  if (old.length) await sb.storage.from("avatars").remove(old);
}

/** Envia a foto já processada e passa a usá-la no perfil. Devolve o endereço público. */
export async function uploadAvatar(sb: SupabaseClient, blob: Blob): Promise<string> {
  const { data: u } = await sb.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Entre na sua conta para enviar a foto.");
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${uid}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("avatars").upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
  if (error) throw new Error("Não foi possível enviar a foto agora. Tente de novo.");
  const { error: e2 } = await sb.rpc("set_avatar", { p_path: path });
  if (e2) throw new Error("Não foi possível salvar a foto no seu perfil.");
  void cleanOld(sb, uid, path).catch(() => undefined);
  return publicUrl(sb, path);
}

/** Tira a foto do perfil (e apaga o arquivo). */
export async function removeAvatar(sb: SupabaseClient): Promise<void> {
  const { data: u } = await sb.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return;
  await sb.rpc("set_avatar", { p_path: null });
  await cleanOld(sb, uid, null).catch(() => undefined);
}
