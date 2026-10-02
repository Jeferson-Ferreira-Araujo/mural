import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

let browserClient: SupabaseClient | null = null;

/** Cliente do navegador: guarda a sessão (login do dono do mural) e usa PKCE. */
export function getBrowserSupabase(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(url, key, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return browserClient;
}

/** Cliente anônimo para o servidor (páginas públicas): sem sessão. */
export function getServerSupabase(): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
