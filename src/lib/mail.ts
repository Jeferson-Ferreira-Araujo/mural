import { SITE_HOST } from "./mural";
import type { Locale } from "@/i18n/config";
import { MAIL_TEXT } from "./mailText";

/** E-mails do Pinz pelo Resend (só no servidor). A chave fica em RESEND_API_KEY, fora do código; sem ela, nada é enviado e nada quebra. */
const FROM = process.env.MAIL_FROM || "Pinz <contato@pinz.digital>";
const REPLY_TO = process.env.MAIL_REPLY_TO || "contato@pinz.digital";

export async function sendMail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html, text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.error("mail: o Resend recusou o envio", r.status);
    return r.ok;
  } catch (e) {
    console.error("mail: falha ao enviar", e instanceof Error ? e.message : e);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** Corpo comum dos e-mails: título, linhas, botão e rodapé; o árabe lê da direita para a esquerda. */
function layout(lang: Locale, title: string, rows: string[], open: string, foot: string): { html: string; text: string } {
  const url = `https://${SITE_HOST}`;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const html = `<div dir="${dir}" style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2a1c12"><h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>${rows.map((l) => `<p style="margin:4px 0;line-height:1.5">${esc(l)}</p>`).join("")}<p style="margin:20px 0"><a href="${url}" style="background:#1f232b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:bold">${esc(open)}</a></p><p style="color:#6b5440;font-size:13px">${esc(foot)}</p></div>`;
  return { html, text: `${title}\n\n${rows.join("\n")}\n\n${url}\n\n${foot}` };
}

export type PurchaseMail = { lang: Locale; item: string; kind: "credits" | "gift" | "plus_days" | "lifetime"; n?: number; amount: string; paymentId: string };

/** Confirmação de compra: simples, sem imagens e sem rastreadores. */
export function purchaseMail(p: PurchaseMail): { subject: string; html: string; text: string } {
  const t = MAIL_TEXT[p.lang] ?? MAIL_TEXT.en;
  const detail = p.kind === "credits" ? t.credits : p.kind === "gift" ? t.gift : p.kind === "plus_days" ? t.days : t.life;
  const rows = [`${t.item}: ${p.item}`, detail.replace("{n}", String(p.n ?? "")), `${t.amount}: ${p.amount}`, `${t.pid}: ${p.paymentId}`];
  return { subject: t.subject, ...layout(p.lang, t.hello, rows, t.open, t.foot) };
}

export type PlusMail = { lang: Locale; type: "paid" | "failed" | "canceled"; amount?: string };

/** Avisos da assinatura mensal do PINZ+: cobrança paga (ou renovada), cobrança que falhou e cancelamento. */
export function plusMail(p: PlusMail): { subject: string; html: string; text: string } {
  const t = MAIL_TEXT[p.lang] ?? MAIL_TEXT.en;
  const x = p.type === "paid" ? { s: t.paidS, t: t.paidT, b: t.paidB } : p.type === "failed" ? { s: t.failS, t: t.failT, b: t.failB } : { s: t.cancS, t: t.cancT, b: t.cancB };
  const rows = [x.b, ...(p.amount ? [`${t.amount}: ${p.amount}`] : [])];
  return { subject: x.s, ...layout(p.lang, x.t, rows, t.open, t.foot) };
}
