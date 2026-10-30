import { NextResponse } from "next/server";
import { fail, requireAdmin } from "@/lib/adminAuth";
import { adminClient } from "@/lib/mercadopago";
import { NEWS_LOCALES } from "@/lib/news";
import type { NoticeTexts } from "@/lib/notice";
import { translateText } from "@/lib/translateText";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Publica (ou atualiza) o aviso da tela inicial: recebe o texto em português, traduz para os outros 18 idiomas e salva.
 * Corpo: { id?, title, body, button?, link?, image?, active, again? }. "again" faz o aviso aparecer de novo para quem já o fechou.
 * Idioma que falhar na tradução fica sem texto e o site mostra o português nele (a resposta traz "failed").
 */
export async function POST(req: Request) {
  const who = await requireAdmin(req);
  if (typeof who !== "string") return who;
  const { id, title, body, button, link, image, active, again } = (await req.json().catch(() => ({}))) as { id?: string; title?: string; body?: string; button?: string; link?: string; image?: string; active?: boolean; again?: boolean };
  if (!title?.trim() || !body?.trim() || title.length > 120 || body.length > 600) return fail(400, "invalid_text");
  if (id && !/^[0-9a-f-]{36}$/i.test(id)) return fail(400, "invalid_id");
  const img = image?.trim() || null;
  if (img && (img.length > 300 || !/^(\/|https:\/\/)[^\s"<>]+$/.test(img))) return fail(400, "invalid_image");
  const url = link?.trim() || null;
  if (url && (url.length > 300 || !/^(\/(?!\/)|https:\/\/)[^\s"<>]+$/.test(url))) return fail(400, "invalid_link");
  const btn = button?.trim() || "";
  if (btn.length > 40) return fail(400, "invalid_button");
  const label = url ? btn || "Saiba mais" : "";

  const texts: NoticeTexts = { pt: { t: title.trim(), b: body.trim(), ...(label ? { c: label } : {}) } };
  const failed: string[] = [];
  const langs = NEWS_LOCALES.filter((l) => l !== "pt");
  for (let i = 0; i < langs.length; i += 6) {
    await Promise.all(
      langs.slice(i, i + 6).map(async (l) => {
        const [t, b, c] = await Promise.all([translateText(title.trim(), l), translateText(body.trim(), l), label ? translateText(label, l) : Promise.resolve("")]);
        if (t && b && c !== null) texts[l] = { t, b, ...(c ? { c } : {}) };
        else failed.push(l);
      }),
    );
  }

  const admin = adminClient();
  const row = { texts, image_url: img, link_url: url, active: active !== false, updated_at: new Date().toISOString() };
  let error;
  if (id) {
    let rev: number | undefined;
    if (again) {
      const { data } = await admin.from("site_notices").select("rev").eq("id", id).maybeSingle();
      rev = (data?.rev ?? 1) + 1;
    }
    ({ error } = await admin.from("site_notices").update(rev ? { ...row, rev } : row).eq("id", id));
  } else {
    ({ error } = await admin.from("site_notices").insert(row));
  }
  if (error) return fail(500, "save_failed");
  return NextResponse.json({ ok: true, failed });
}
