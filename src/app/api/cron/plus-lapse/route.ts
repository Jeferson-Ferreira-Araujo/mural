import { NextResponse } from "next/server";
import { adminClient } from "@/lib/mercadopago";
import { isLocale, type Locale } from "@/i18n/config";
import { sendMail } from "@/lib/mail";
import { LAPSE_TEXT } from "@/lib/lapseMailText";
import { SITE_HOST } from "@/lib/mural";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Notice = { userId: string; nick: string; locale: string | null; kind: "start" | "last"; days: number };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/**
 * Chamada uma vez por dia pelo agendador do banco (pg_cron), só com o segredo certo.
 * Avisa por e-mail quem ficou sem PINZ+ e tem murais além do que o plano grátis comporta: no início da carência de 15 dias e quando faltam 3 dias ou menos.
 */
export async function POST(req: Request) {
  const given = req.headers.get("x-cron-secret") ?? "";
  const db = adminClient();
  const { data: okSecret } = given ? await db.rpc("check_cron_secret", { p_secret: given }) : { data: false };
  if (okSecret !== true) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await db.rpc("claim_plus_lapse_notices");
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  const list = (Array.isArray(data) ? data : []) as Notice[];

  let mailed = 0;
  for (const n of list) {
    const lang: Locale = isLocale(n.locale) ? n.locale : "pt";
    const t = LAPSE_TEXT[lang];
    const { data: u } = await db.auth.admin.getUserById(n.userId);
    const to = u.user?.email;
    if (!to) continue;
    const text = (n.kind === "start" ? t.start : t.last).replace("{n}", String(n.days));
    const url = `https://${SITE_HOST}/`;
    const html = `<div dir="${lang === "ar" ? "rtl" : "ltr"}" style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2a1c12"><p style="line-height:1.5">${esc(text)}</p><p style="margin-top:20px"><a href="${url}" style="display:inline-block;background:#f2b81c;color:#2a1c12;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px">${esc(t.btn)}</a></p></div>`;
    if (await sendMail({ to, subject: t.subject, html, text: `${text}\n\n${url}` })) mailed++;
  }
  return NextResponse.json({ notices: list.length, mailed });
}
