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

/** Abre o pagamento no Mercado Pago. `product` = "plus" ou "credits:<id do pacote>". Em caso de sucesso, a página vai para o Mercado Pago. */
export async function startCheckout(product: string): Promise<string | null> {
  const r = await post("/api/pay/checkout", { product });
  if (r.ok && typeof r.data.url === "string") {
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
