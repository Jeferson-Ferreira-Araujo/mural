import { CREDIT_PACKS, PLUS_ANNUAL_CENTS, PLUS_GIFT_CENTS, PLUS_LIFETIME_CENTS, PLUS_PRICE_CENTS } from "./plans";
import { adminClient, isUuid } from "./mercadopago";
import { formatMoney, type Currency } from "./money";
import { purchaseMail, sendMail } from "./mail";

/**
 * O que se pode comprar com pagamento único (Pix ou cartão), só no servidor: pacotes de créditos, PINZ+ anual, PINZ+ vitalício e o presente de 1 mês.
 * Preço, créditos e dias vêm SEMPRE daqui, nunca do navegador. A referência do pagamento no Mercado Pago é "<comprador>:<id>" (presente: "<comprador>:gift:<quem recebe>").
 */
export type Item = { id: string; kind: "credits" | "plus" | "gift"; cents: number; title: string; credits?: number; days?: number | null };

export function itemForId(id: string): Item | undefined {
  const pack = CREDIT_PACKS.find((p) => p.id === id);
  if (pack) return { id: pack.id, kind: "credits", cents: pack.cents, credits: pack.credits, title: `Pinz — ${pack.credits} créditos` };
  if (id === "plus_month") return { id, kind: "plus", cents: PLUS_PRICE_CENTS, days: 30, title: "Pinz — PINZ+ por 1 mês" };
  if (id === "plus_annual") return { id, kind: "plus", cents: PLUS_ANNUAL_CENTS, days: 365, title: "Pinz — PINZ+ anual" };
  if (id === "plus_life") return { id, kind: "plus", cents: PLUS_LIFETIME_CENTS, days: null, title: "Pinz — PINZ+ vitalício" };
  if (id === "gift") return { id, kind: "gift", cents: PLUS_GIFT_CENTS, days: 30, title: "Pinz — presente: 1 mês de PINZ+" };
  return undefined;
}

/** "credits:c3" | "plus_annual" | "plus_life" | "gift" → item. */
export const itemForProduct = (product: string): Item | undefined => itemForId(product.startsWith("credits:") ? product.slice(8) : product);

export const refFor = (buyer: string, item: Item, recipient?: string) => (item.kind === "gift" && recipient ? `${buyer}:gift:${recipient}` : `${buyer}:${item.id}`);

/** Lê a referência de um pagamento: quem pagou, o que comprou e (presente) quem recebe. */
export function parseRef(ref: unknown): { buyer: string; item: Item; recipient?: string } | null {
  const [buyer, id, recipient] = String(ref ?? "").split(":");
  const item = itemForId(id ?? "");
  if (!isUuid(buyer) || !item) return null;
  if (item.kind === "gift") return isUuid(recipient) && recipient !== buyer ? { buyer, item, recipient } : null;
  return { buyer, item };
}

/** Quem pode receber o presente (existe, não é quem paga, não tem assinatura mensal ativa nem vitalício). `reason` vem preenchido quando não pode. */
export async function giftRecipient(buyer: string, nickname: string): Promise<{ id: string | null; nickname: string | null; reason: string | null }> {
  const { data } = await adminClient().rpc("_gift_check", { p_buyer: buyer, p_nick: nickname });
  const row = (Array.isArray(data) ? data[0] : data) as { recipient?: string | null; nickname?: string | null; reason?: string | null } | null;
  return { id: row?.recipient ?? null, nickname: row?.nickname ?? null, reason: row?.reason ?? "not_found" };
}

/** Grava o pagamento no banco e aplica o efeito (créditos ou PINZ+). Idempotente: o mesmo pagamento nunca soma duas vezes. */
/** Avisa o comprador por e-mail, uma vez por pagamento (o aviso do provedor pode chegar repetido). Falha no envio nunca desfaz a compra. */
async function notifyPurchase(parsed: { buyer: string; item: Item }, paymentId: string, currency: Currency) {
  try {
    const db = adminClient();
    const { error: dup } = await db.from("payment_emails").insert({ payment_id: paymentId });
    if (dup) return; // já enviado
    const { data } = await db.auth.admin.getUserById(parsed.buyer);
    const to = data.user?.email;
    if (!to) return;
    const lang = currency === "BRL" ? "pt" : "en";
    const { item } = parsed;
    const pt = lang === "pt";
    const detail =
      item.kind === "credits" ? (pt ? `${item.credits} créditos foram adicionados à sua conta.` : `${item.credits} credits were added to your account.`)
      : item.kind === "gift" ? (pt ? "O presente de 1 mês de PINZ+ foi enviado." : "Your 1-month PINZ+ gift was sent.")
      : item.days ? (pt ? `PINZ+ ativo por ${item.days} dias.` : `PINZ+ is active for ${item.days} days.`)
      : (pt ? "PINZ+ vitalício ativado." : "Lifetime PINZ+ activated.");
    const mail = purchaseMail({ lang, item: item.title, detail, amount: formatMoney(item.cents, currency, pt ? "pt-BR" : "en-US"), paymentId: paymentId.replace(/^stripe:/, "") });
    const sent = await sendMail({ to, ...mail });
    if (!sent) await db.from("payment_emails").delete().eq("payment_id", paymentId); // não saiu: libera para a próxima tentativa do provedor
  } catch (e) {
    console.error("notifyPurchase", e instanceof Error ? e.message : e);
  }
}

export async function applyPayment(parsed: { buyer: string; item: Item; recipient?: string }, paymentId: string, status: string, currency: Currency = "BRL"): Promise<boolean> {
  const { buyer, item, recipient } = parsed;
  const db = adminClient();
  const done = async (ok: boolean) => {
    if (ok && status === "approved") await notifyPurchase(parsed, paymentId, currency);
    return ok;
  };
  if (item.kind === "credits") {
    const { error } = await db.rpc("pay_credits_apply", { p_user: buyer, p_payment: paymentId, p_credits: item.credits, p_cents: item.cents, p_status: status });
    return done(!error);
  }
  const { error } = await db.rpc("pay_plus_once", { p_user: item.kind === "gift" ? recipient : buyer, p_payment: paymentId, p_days: item.days ?? null, p_cents: item.cents, p_status: status, p_buyer: buyer });
  return done(!error);
}
