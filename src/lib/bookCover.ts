import type { SupabaseClient } from "@supabase/supabase-js";

/** Capa de livro (display de Leitura): reduzida no próprio aparelho, enviada ao armazenamento e verificada pelo mesmo detector de nudez das fotos de pin. */
const MAX_W = 720;
const MAX_H = 1080;
export const MAX_COVER_MB = 12;

export class InappropriateCover extends Error {}

/** Reduz a foto (mantendo a proporção, sem cortar) para o tamanho de uma capa e converte para WebP (ou JPEG). */
export async function prepareCover(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  if (file.size > MAX_COVER_MB * 1024 * 1024) throw new Error(`A foto pode ter até ${MAX_COVER_MB} MB.`);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Não foi possível ler essa imagem. Tente uma foto JPG, PNG ou WebP.");
  }
  const k = Math.min(1, MAX_W / bitmap.width, MAX_H / bitmap.height);
  const w = Math.max(1, Math.round(bitmap.width * k));
  const h = Math.max(1, Math.round(bitmap.height * k));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  const webp = await toBlob("image/webp", 0.86);
  const out = webp && webp.type === "image/webp" ? webp : await toBlob("image/jpeg", 0.88);
  if (!out) throw new Error("Não foi possível processar a imagem.");
  return out;
}

/** Envia a capa para a pasta do próprio usuário e a submete à verificação. Devolve o endereço e a aprovação assinada que o banco exige. */
export async function uploadBookCover(sb: SupabaseClient, file: File): Promise<{ url: string; approval: { exp: number; sig: string } }> {
  const blob = await prepareCover(file);
  const { data: u } = await sb.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Entre na sua conta para enviar a capa.");
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from("pin-media").upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
  if (error) throw new Error("Não foi possível enviar a capa agora. Tente de novo.");
  const { data: s } = await sb.auth.getSession();
  const res = await fetch("/api/pin/verify", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session?.access_token ?? ""}` }, body: JSON.stringify({ path }) });
  if (res.status === 422) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    if (body?.error === "nsfw") throw new InappropriateCover();
    throw new Error("Não foi possível ler essa imagem.");
  }
  if (!res.ok) throw new Error("A verificação da imagem está indisponível agora. Tente de novo em instantes.");
  const approval = (await res.json()) as { exp: number; sig: string };
  return { url: sb.storage.from("pin-media").getPublicUrl(path).data.publicUrl, approval };
}
