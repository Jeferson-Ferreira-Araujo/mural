import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const REMEMBER_KEY = "pinz:remember";
const EMAIL_KEY = "pinz:email";

/** "Lembrar de mim" ligado (padrão): a sessão fica no aparelho. Desligado: some ao fechar o navegador. */
export const getRemember = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
};
export function setRemember(on: boolean, email?: string) {
  try {
    localStorage.setItem(REMEMBER_KEY, on ? "1" : "0");
    if (on && email) localStorage.setItem(EMAIL_KEY, email);
    else localStorage.removeItem(EMAIL_KEY);
  } catch {}
}
/** E-mail lembrado (a senha nunca é guardada por nós). */
export const getRememberedEmail = () => {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
};

/** Guarda a sessão em localStorage (lembrar) ou sessionStorage (só esta aba/janela), conforme a escolha. */
const sessionStore = {
  getItem: (k: string) => {
    try {
      return localStorage.getItem(k) ?? sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      const [keep, drop] = getRemember() ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
      keep.setItem(k, v);
      drop.removeItem(k);
    } catch {}
  },
  removeItem: (k: string) => {
    try {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    } catch {}
  },
};

let browserClient: SupabaseClient | null = null;

/** Cliente do navegador: guarda a sessão (login do dono do mural) e usa PKCE. */
export function getBrowserSupabase(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(url, key, {
      auth: { flowType: "pkce", persistSession: true, storage: sessionStore, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return browserClient;
}

/** Cliente anônimo para o servidor (páginas públicas): sem sessão. */
export function getServerSupabase(): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
