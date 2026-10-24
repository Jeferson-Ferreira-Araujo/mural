import { NextResponse } from "next/server";
import webpush from "web-push";
import { adminClient } from "@/lib/mercadopago";
import { isLocale, type Locale } from "@/i18n/config";
import { sendMail } from "@/lib/mail";
import { MAIL_TEXT } from "@/lib/mailText";
import { REMINDER_TEXT } from "@/lib/reminderText";
import { SITE_HOST } from "@/lib/mural";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Due = { userId: string; title: string; nick: string; slug: string; locale: string | null; push: boolean; email: boolean; subs: { endpoint: string; p256dh: string; auth: string }[] };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/**
 * Chamada a cada poucos minutos pelo agendador do banco (pg_cron), só com o segredo certo.
 * Separa os lembretes de hábito que vencem agora e ainda não foram marcados, e avisa por notificação no aparelho (Web Push) e, se a pessoa quis, por e-mail.
 * O aviso dentro do site (sino) já é criado pelo próprio banco.
 */
export async function POST(req: Request) {
  const given = req.headers.get("x-cron-secret") ?? "";
  const db = adminClient();
  // o segredo do agendador mora só no cofre do banco: aqui ele é conferido lá, sem passar pelo código nem pelo ambiente
  const { data: okSecret } = given ? await db.rpc("check_cron_secret", { p_secret: given }) : { data: false };
  if (okSecret !== true) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await db.rpc("claim_due_habit_reminders");
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  const due = (Array.isArray(data) ? data : []) as Due[];

  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv) webpush.setVapidDetails("mailto:contato@pinz.digital", pub, priv);
  let pushed = 0;
  let mailed = 0;
  for (const d of due) {
    const lang: Locale = isLocale(d.locale) ? d.locale : "pt";
    const t = REMINDER_TEXT[lang];
    const body = t.body.replace("{habit}", d.title);
    const url = `https://${SITE_HOST}/${d.nick}/${d.slug}`;
    if (d.push && pub && priv) {
      for (const s of d.subs) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: "Pinz", body, url }), { TTL: 3 * 3600 });
          pushed++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint); // aparelho que desligou ou desinstalou
        }
      }
    }
    if (d.email) {
      const { data: u } = await db.auth.admin.getUserById(d.userId);
      const to = u.user?.email;
      if (to) {
        const m = MAIL_TEXT[lang];
        const text = t.mail.replace("{habit}", d.title);
        const html = `<div dir="${lang === "ar" ? "rtl" : "ltr"}" style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2a1c12"><p style="line-height:1.5">${esc(text)}</p><p style="margin:20px 0"><a href="${url}" style="background:#1f232b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:bold">${esc(m.open)}</a></p></div>`;
        if (await sendMail({ to, subject: t.subject.replace("{habit}", d.title), html, text: `${text}\n\n${url}` })) mailed++;
      }
    }
  }
  return NextResponse.json({ due: due.length, pushed, mailed });
}
