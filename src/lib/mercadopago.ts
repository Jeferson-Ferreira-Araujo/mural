import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE_HOST } from "./mural";

/**
 * Mercado Pago (só no servidor). As credenciais ficam em variáveis de ambiente, nunca no navegador:
 *  MP_ACCESS_TOKEN       token de acesso da aplicação (produção; ou o de teste, para experimentar)
 *  MP_WEBHOOK_SECRET     assinatura secreta do webhook (painel do Mercado Pago > Webhooks)
 *  SUPABASE_SECRET_KEY   chave secreta do Supabase (só o servidor grava pagamentos)
 */
const TOKEN = process.env.MP_ACCESS_TOKEN ?? "";
const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";

export const SITE_URL = `https://${SITE_HOST}`;
export const paymentsConfigured = () => !!TOKEN && !!SECRET_KEY && !!SUPABASE_URL;

/** Cliente do Supabase com poder total: só dentro das rotas do servidor. */
export const adminClient = (): SupabaseClient => createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } });

export async function mp<T = Record<string, unknown>>(path: string, init?: { method?: string; body?: unknown }): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init?.method === "POST" ? { "X-Idempotency-Key": crypto.randomUUID() } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** Confere a assinatura do aviso (x-signature). Sem segredo configurado, não bloqueia: cada aviso é conferido de novo direto no Mercado Pago. */
export function validSignature(req: Request, dataId: string | null): boolean {
  if (!WEBHOOK_SECRET) return true;
  const sig = req.headers.get("x-signature") ?? "";
  const ts = /(?:^|,)\s*ts=([^,]+)/.exec(sig)?.[1];
  const v1 = /(?:^|,)\s*v1=([^,]+)/.exec(sig)?.[1];
  if (!ts || !v1) return false;
  const id = dataId && /^[A-Za-z0-9]+$/.test(dataId) ? dataId.toLowerCase() : (dataId ?? "");
  const manifest = `id:${id};request-id:${req.headers.get("x-request-id") ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const isUuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Atualiza o estado da assinatura PINZ+ no banco a partir do que o Mercado Pago diz agora. */
export async function syncPreapproval(preapprovalId: string): Promise<{ ok: boolean; uid?: string }> {
  const r = await mp<{ id?: string; status?: string; external_reference?: string; next_payment_date?: string }>(`/preapproval/${encodeURIComponent(preapprovalId)}`);
  if (!r.ok) return { ok: false };
  const uid = r.data.external_reference;
  if (!isUuid(uid) || !r.data.id) return { ok: true }; // não é uma assinatura nossa: ignora
  const status = r.data.status ?? "pending";
  // vale até a próxima cobrança + 3 dias de tolerância
  const next = r.data.next_payment_date ? new Date(r.data.next_payment_date).getTime() : Date.now() + 30 * 864e5;
  const paidUntil = new Date(next + 3 * 864e5).toISOString();
  const { error } = await adminClient().rpc("pay_plus_apply", { p_user: uid, p_preapproval: r.data.id, p_status: status, p_paid_until: paidUntil });
  return { ok: !error, uid };
}
