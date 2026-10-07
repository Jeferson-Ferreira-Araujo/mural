import { getBrowserSupabase } from "./supabase";

export type Subscription = { status: "pending" | "authorized" | "paused" | "cancelled"; paidUntil: string | null; active: boolean } | null;

async function token(): Promise<string | null> {
  const { data } = await getBrowserSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

async function post(path: string, body?: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const jwt = await token();
  if (!jwt) return { ok: false, data: { error: "not_authenticated" } };
  try {
    const res = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
    return { ok: res.ok, data: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, data: { error: "network" } };
  }
}

const MESSAGE: Record<string, string> = {
  not_authenticated: "Entre na sua conta para continuar.",
  already_subscribed: "Você já tem uma assinatura PLUS ativa.",
  rate_limited: "Muitas tentativas. Tente de novo em instantes.",
  unavailable: "O pagamento ainda não está disponível.",
};

const RETURN_KEY = "pinz:payReturn";

/** Guarda a tela de onde a pessoa saiu para pagar: ao voltar do Mercado Pago ela cai de novo ali (vale por 2 horas). */
function rememberReturn() {
  try {
    localStorage.setItem(RETURN_KEY, JSON.stringify({ path: window.location.pathname, at: Date.now() }));
  } catch {}
}

/** Lê e apaga a tela de origem guardada (só caminhos internos). */
export function takePayReturn(): string | null {
  try {
    const raw = localStorage.getItem(RETURN_KEY);
    localStorage.removeItem(RETURN_KEY);
    const v = raw ? (JSON.parse(raw) as { path?: string; at?: number }) : null;
    if (!v?.path || !v.path.startsWith("/") || v.path.startsWith("//") || v.path.startsWith("/pagamento") || Date.now() - (v.at ?? 0) > 2 * 3600_000) return null;
    return v.path;
  } catch {
    return null;
  }
}

/** Abre o pagamento no Mercado Pago. `product` = "plus" ou "credits:<id do pacote>". Em caso de sucesso, a página vai para o Mercado Pago. */
export async function startCheckout(product: string): Promise<string | null> {
  const r = await post("/api/pay/checkout", { product });
  if (r.ok && typeof r.data.url === "string") {
    rememberReturn();
    window.location.assign(r.data.url);
    return null;
  }
  return MESSAGE[String(r.data.error)] ?? "Não foi possível abrir o pagamento agora. Tente de novo.";
}

export async function fetchSubscription(): Promise<Subscription> {
  const { data, error } = await getBrowserSupabase().rpc("my_subscription");
  return error || !data ? null : (data as Subscription);
}

/** Cancela a assinatura PLUS. O PLUS vale até o fim do período já pago. */
export async function cancelSubscription(): Promise<boolean> {
  return (await post("/api/pay/cancel")).ok;
}

export type TxPayment = { ref: string; kind: "credits" | "plus"; cents: number; credits: number | null; status: string; at: string };
export type TxLedger = { delta: number; reason: string; at: string };
export type Transactions = { payments: TxPayment[]; ledger: TxLedger[]; subscription: Subscription };

/** Extrato da própria conta: o que foi pago e no que os créditos foram gastos. */
export async function fetchTransactions(): Promise<Transactions | null> {
  const { data, error } = await getBrowserSupabase().rpc("my_transactions");
  return error || !data ? null : (data as Transactions);
}

export const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const PAY_STATUS: Record<string, { text: string; tone: "ok" | "wait" | "bad" }> = {
  approved: { text: "Aprovado", tone: "ok" },
  authorized: { text: "Aprovado", tone: "ok" },
  pending: { text: "Pendente", tone: "wait" },
  in_process: { text: "Em análise", tone: "wait" },
  rejected: { text: "Recusado", tone: "bad" },
  cancelled: { text: "Cancelado", tone: "bad" },
  refunded: { text: "Reembolsado", tone: "bad" },
  charged_back: { text: "Estornado", tone: "bad" },
};
