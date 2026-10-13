import { getBrowserSupabase } from "./supabase";
import { PAY_ERROR } from "./payments";

export type CardResult = { status: "approved" | "in_process" | "pending" | "rejected" | "error"; id?: string; message?: string | null };

/** Paga com o cartão dentro do Pinz: manda só o código do cartão (gerado pelo Mercado Pago no navegador), nunca os dados do cartão. */
export async function payCard(product: string, card: { token: string; paymentMethodId: string; issuerId?: string | number | null; identification?: { type?: string; number?: string } | null }, recipient?: string): Promise<CardResult> {
  const { data } = await getBrowserSupabase().auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) return { status: "error", message: "Entre na sua conta para continuar." };
  try {
    const res = await fetch("/api/pay/card", { method: "POST", headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" }, body: JSON.stringify({ product, ...card, ...(recipient ? { recipient } : {}) }) });
    const d = (await res.json().catch(() => ({}))) as { status?: string; id?: string; message?: string | null; error?: string };
    if (typeof d.status === "string") return { status: d.status as CardResult["status"], id: d.id, message: d.message ?? null };
    return { status: "error", message: PAY_ERROR[String(d.error)] ?? (d.error === "rate_limited" ? "Muitas tentativas. Tente de novo em instantes." : "Não foi possível concluir o pagamento agora. Tente de novo.") };
  } catch {
    return { status: "error", message: "Sem conexão. Tente de novo." };
  }
}

let publicKey: Promise<string | null> | null = null;
/** Chave pública do Mercado Pago do ambiente em uso (a chave secreta nunca sai do servidor). */
export function getMpPublicKey(): Promise<string | null> {
  if (!publicKey) {
    publicKey = fetch("/api/pay/config", { cache: "no-store" })
      .then(async (res) => (res.ok ? (((await res.json()) as { publicKey?: string }).publicKey ?? null) : null))
      .catch(() => null)
      .then((k) => {
        if (!k) publicKey = null; // tenta de novo na próxima vez
        return k;
      });
  }
  return publicKey;
}

let sdk: Promise<boolean> | null = null;
/** Carrega o JavaScript do Mercado Pago (campos seguros do cartão) uma vez só. */
export function loadMpSdk(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as unknown as { MercadoPago?: unknown }).MercadoPago) return Promise.resolve(true);
  if (!sdk) {
    sdk = new Promise<boolean>((resolve) => {
      const s = document.createElement("script");
      s.src = "https://sdk.mercadopago.com/js/v2";
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => {
        sdk = null;
        resolve(false);
      };
      document.head.appendChild(s);
    });
  }
  return sdk;
}

/** Assina o PINZ+ (cobrança mensal no cartão) dentro do Pinz: manda só o código do cartão. */
export async function paySubscription(card: { token: string; paymentMethodId: string; issuerId?: string | number | null; identification?: { type?: string; number?: string } | null }): Promise<CardResult> {
  const { data } = await getBrowserSupabase().auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) return { status: "error", message: "Entre na sua conta para continuar." };
  try {
    const res = await fetch("/api/pay/subscribe", { method: "POST", headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" }, body: JSON.stringify(card) });
    const d = (await res.json().catch(() => ({}))) as { status?: string; message?: string | null; error?: string };
    if (typeof d.status === "string") return { status: d.status as CardResult["status"], message: d.message ?? null };
    return { status: "error", message: d.error === "already_plus_once" ? "Você já tem o PINZ+ por compra única (anual ou vitalício)." : d.error === "already_subscribed" ? "Você já tem uma assinatura PINZ+ ativa." : d.error === "rate_limited" ? "Muitas tentativas. Tente de novo em instantes." : "Não foi possível concluir a assinatura agora. Tente de novo." };
  } catch {
    return { status: "error", message: "Sem conexão. Tente de novo." };
  }
}
