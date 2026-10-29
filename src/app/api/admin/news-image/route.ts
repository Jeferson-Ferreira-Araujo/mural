import { NextResponse } from "next/server";
import { fail, requireAdmin } from "@/lib/adminAuth";
import { adminClient } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX = 3 * 1024 * 1024;

/** Envia a imagem de uma novidade para o armazenamento (bucket público "news") e devolve o endereço. Corpo: multipart com o campo "file". */
export async function POST(req: Request) {
  const who = await requireAdmin(req);
  if (typeof who !== "string") return who;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail(400, "no_file");
  const ext = TYPES[file.type];
  if (!ext) return fail(400, "invalid_type");
  if (file.size > MAX) return fail(413, "too_large");
  const admin = adminClient();
  const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await admin.storage.from("news").upload(path, await file.arrayBuffer(), { contentType: file.type, cacheControl: "31536000" });
  if (error) return fail(500, "upload_failed");
  return NextResponse.json({ ok: true, url: admin.storage.from("news").getPublicUrl(path).data.publicUrl });
}
