import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE_HOST } from "./mural";

/**
 * Mercado Pago (só no servidor). As credenciais ficam em variáveis de ambiente, nunca no navegador. Há dois ambientes, e o /admin escolhe
 * qual vale (tabela app_settings, chave pay_mode; sem valor = "test"):
 *  teste     MP_ACCESS_TOKEN_TEST  (ou, como era antes, MP_ACCESS_TOKEN)   e  MP_WEBHOOK_SECRET_TEST (ou MP_WEBHOOK_SECRET)
 *  produção  MP_ACCESS_TOKEN_LIVE                                            e  MP_WEBHOOK_SECRET_LIVE
 *  SUPABASE_SECRET_KEY   chave secreta do Supabase (só o servidor grava pagamentos)
 * Em produção sem token configurado, os pagamentos ficam indisponíveis (nunca cai para o teste em silêncio).
 */
export type PayEnv = "test" | "live";
const TOKENS: Record<PayEnv, string> = { test: process.env.MP_ACCESS_TOKEN_TEST ?? process.env.MP_ACCESS_TOKEN ?? "", live: process.env.MP_ACCESS_TOKEN_LIVE ?? "" };
const SECRETS: Record<PayEnv, string> = { test: process.env.MP_WEBHOOK_SECRET_TEST ?? process.env.MP_WEBHOOK_SECRET ?? "", live: process.env.MP_WEBHOOK_SECRET_LIVE ?? "" };
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";

export const SITE_URL = `https://${SITE_HOST}`;
/** O ambiente tem token (e o servidor sabe falar com o banco)? */
export const envConfigured = (env: PayEnv) => !!TOKENS[env] && !!SECRET_KEY && !!SUPABASE_URL;

/** Cliente do Supabase com poder total: só dentro das rotas do servidor. */
export const adminClient = (): SupabaseClient => createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } });

let modeCache: { at: number; env: PayEnv } | null = null;
/** Ambiente em uso agora (lido do banco; guardado por 5 s). Qualquer falha de leitura cai para "teste", que nunca cobra de verdade. */
export async function payMode(fresh = false): Promise<PayEnv> {
  if (!fresh && modeCache && Date.now() - modeCache.at < 5000) return modeCache.env;
  let env: PayEnv = "test";
  try {
    const { data } = await adminClient().from("app_settings").select("value").eq("key", "pay_mode").maybeSingle();
    if (data?.value === "live") env = "live";
  } catch {
    /* sem leitura: teste */
  }
  modeCache = { at: Date.now(), env };
  return env;
}
export async function setPayMode(env: PayEnv, by: string): Promise<boolean> {
  const { error } = await adminClient().from("app_settings").upsert({ key: "pay_mode", value: env, updated_at: new Date().toISOString(), updated_by: by });
  if (!error) modeCache = { at: Date.now(), env };
  return !error;
}
export const paymentsConfigured = async (env?: PayEnv) => envConfigured(env ?? (await payMode()));

export async function mp<T = Record<string, unknown>>(path: string, init?: { method?: string; body?: unknown }, env?: PayEnv): Promise<{ ok: boolean; status: number; data: T }> {
  const e = env ?? (await payMode());
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${TOKENS[e]}`, "Content-Type": "application/json", ...(init?.method === "POST" ? { "X-Idempotency-Key": crypto.randomUUID() } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** Como mp(), mas se o ambiente em uso não conhece o objeto (assinatura criada no outro ambiente), tenta o outro. */
export async function mpEither<T = Record<string, unknown>>(path: string, init?: { method?: string; body?: unknown }): Promise<{ ok: boolean; status: number; data: T; env: PayEnv }> {
  const first = await payMode();
  const second: PayEnv = first === "live" ? "test" : "live";
  const a = await mp<T>(path, init, first);
  if (a.ok || !envConfigured(second) || (a.status !== 404 && a.status !== 401 && a.status !== 403)) return { ...a, env: first };
  const b = await mp<T>(path, init, second);
  return b.ok ? { ...b, env: second } : { ...a, env: first };
}

const checkSecret = (secret: string, req: Request, dataId: string | null): boolean => {
  const sig = req.headers.get("x-signature") ?? "";
  const ts = /(?:^|,)\s*ts=([^,]+)/.exec(sig)?.[1];
  const v1 = /(?:^|,)\s*v1=([^,]+)/.exec(sig)?.[1];
  if (!ts || !v1) return false;
  const id = dataId && /^[A-Za-z0-9]+$/.test(dataId) ? dataId.toLowerCase() : (dataId ?? "");
  const manifest = `id:${id};request-id:${req.headers.get("x-request-id") ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Confere a assinatura do aviso (x-signature) e diz de qual ambiente ele é (a assinatura de teste e a de produção são diferentes).
 * Sem nenhum segredo configurado, não bloqueia: vale o ambiente em uso (cada aviso é conferido de novo direto no Mercado Pago).
 */
export async function webhookEnv(req: Request, dataId: string | null): Promise<PayEnv | null> {
  const configured = (["live", "test"] as PayEnv[]).filter((e) => SECRETS[e]);
  if (configured.length === 0) return payMode();
  for (const e of configured) if (checkSecret(SECRETS[e], req, dataId)) return e;
  return null;
}

export const isUuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Atualiza o estado da assinatura PINZ+ no banco a partir do que o Mercado Pago diz agora. */
export async function syncPreapproval(preapprovalId: string, env?: PayEnv): Promise<{ ok: boolean; uid?: string }> {
  const r = await mp<{ id?: string; status?: string; external_reference?: string; next_payment_date?: string }>(`/preapproval/${encodeURIComponent(preapprovalId)}`, undefined, env);
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
