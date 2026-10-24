import { SITE_HOST } from "./mural";

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

export type PurchaseMail = { lang: "pt" | "en"; item: string; detail: string; amount: string; paymentId: string };

/** Confirmação de compra: simples, sem imagens e sem rastreadores. */
export function purchaseMail(p: PurchaseMail): { subject: string; html: string; text: string } {
  const pt = p.lang === "pt";
  const subject = pt ? "Sua compra no Pinz foi confirmada" : "Your Pinz purchase is confirmed";
  const hello = pt ? "Pagamento confirmado" : "Payment confirmed";
  const lines = pt
    ? [`Item: ${p.item}`, p.detail, `Valor: ${p.amount}`, `Código do pagamento: ${p.paymentId}`]
    : [`Item: ${p.item}`, p.detail, `Amount: ${p.amount}`, `Payment ID: ${p.paymentId}`];
  const foot = pt ? "Dúvidas? É só responder este e-mail." : "Questions? Just reply to this e-mail.";
  const open = pt ? "Abrir o Pinz" : "Open Pinz";
  const url = `https://${SITE_HOST}`;
  const rows = lines.filter(Boolean);
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2a1c12"><h1 style="font-size:20px;margin:0 0 12px">${esc(hello)}</h1>${rows.map((l) => `<p style="margin:4px 0">${esc(l)}</p>`).join("")}<p style="margin:20px 0"><a href="${url}" style="background:#1f232b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:bold">${esc(open)}</a></p><p style="color:#6b5440;font-size:13px">${esc(foot)}</p></div>`;
  const text = `${hello}\n\n${rows.join("\n")}\n\n${url}\n\n${foot}`;
  return { subject, html, text };
}
