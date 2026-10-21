import { createClient } from "@supabase/supabase-js";
import type { PayProvider } from "./money";
import { providerForCountry, stripeConfigured } from "./stripe";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Quem chama é administrador? (conferido no banco com o login enviado). Administradores podem testar a Stripe de qualquer país. */
async function isAdminRequest(req: Request): Promise<boolean> {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt || !SUPABASE_URL) return false;
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
  const { data } = await sb.rpc("is_admin");
  return data === true;
}

/** Meio de pagamento desta chamada: pelo país, ou Stripe direto se quem chama é administrador (para testar sem VPN). */
export async function providerFor(req: Request): Promise<PayProvider> {
  if (stripeConfigured() && (await isAdminRequest(req))) return "stripe";
  return providerForCountry(req.headers.get("cf-ipcountry"));
}
