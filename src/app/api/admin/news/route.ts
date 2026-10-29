import { NextResponse } from "next/server";
import { fail, requireAdmin } from "@/lib/adminAuth";
import { adminClient } from "@/lib/mercadopago";
import { NEWS_LOCALES, type NewsTexts } from "@/lib/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// códigos que o serviço de tradução entende (o resto é igual ao do site)
const CODE: Record<string, string> = { zh: "zh-CN" };

async function translate(text: string, to: string): Promise<string | null> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=pt-BR|${CODE[to] ?? to}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const j = (await res.json()) as { responseStatus?: number | string; responseData?: { translatedText?: string } };
    const out = j.responseData?.translatedText;
    if (Number(j.responseStatus) !== 200 || !out || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(out)) return null;
    return out;
  } catch {
    return null;
  }
}

/**
 * Publica (ou atualiza) uma novidade: recebe o texto em português, traduz para os outros 18 idiomas e salva tudo.
 * Corpo: { id?, title, body, published }. Idioma que não conseguiu traduzir fica sem texto e o site mostra o português nele
 * (a resposta traz "failed" com esses idiomas; salvar de novo tenta outra vez).
 */
export async function POST(req: Request) {
  const who = await requireAdmin(req);
  if (typeof who !== "string") return who;
  const { id, title, body, published } = (await req.json().catch(() => ({}))) as { id?: string; title?: string; body?: string; published?: boolean };
  if (!title?.trim() || !body?.trim() || title.length > 120 || body.length > 450) return fail(400, "invalid_text");
  if (id && !/^[0-9a-f-]{36}$/i.test(id)) return fail(400, "invalid_id");
  const texts: NewsTexts = { pt: { t: title.trim(), b: body.trim() } };
  const failed: string[] = [];
  const langs = NEWS_LOCALES.filter((l) => l !== "pt");
  for (let i = 0; i < langs.length; i += 6) {
    await Promise.all(
      langs.slice(i, i + 6).map(async (l) => {
        const [t, b] = await Promise.all([translate(title.trim(), l), translate(body.trim(), l)]);
        if (t && b) texts[l] = { t, b };
        else failed.push(l);
      }),
    );
  }
  const admin = adminClient();
  const row = { texts, published: published !== false, updated_at: new Date().toISOString() };
  const { error } = id ? await admin.from("site_news").update(row).eq("id", id) : await admin.from("site_news").insert(row);
  if (error) return fail(500, "save_failed");
  return NextResponse.json({ ok: true, failed });
}
