/**
 * Login com outras contas (Google, Apple...). Os botões só aparecem para os provedores listados em
 * NEXT_PUBLIC_OAUTH_PROVIDERS (ex.: "google,apple"), e cada um precisa estar ligado antes no Supabase (Authentication → Providers).
 */
export type OAuthProvider = "google" | "apple" | "facebook" | "azure" | "github";

export const OAUTH_LABEL: Record<OAuthProvider, string> = {
  google: "Continuar com o Google",
  apple: "Continuar com a Apple",
  facebook: "Continuar com o Facebook",
  azure: "Continuar com a Microsoft",
  github: "Continuar com o GitHub",
};

const KNOWN = Object.keys(OAUTH_LABEL) as OAuthProvider[];

export const OAUTH_PROVIDERS: OAuthProvider[] = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "")
  .split(",")
  .map((p) => p.trim().toLowerCase())
  .filter((p): p is OAuthProvider => (KNOWN as string[]).includes(p));
