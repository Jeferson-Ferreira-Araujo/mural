/** Escolhas de privacidade (LGPD): o essencial (login, idioma, acessibilidade) funciona sempre; as métricas de uso só entram se a pessoa aceitar. Guardado só no aparelho. */
export type Consent = { v: 1; analytics: boolean; at: number };
const KEY = "pinz:consent";
export const CONSENT_EVENT = "pinz:consent";
export const OPEN_CONSENT_EVENT = "pinz:open-consent";

export function getConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Consent;
    return c && c.v === 1 && typeof c.analytics === "boolean" ? c : null;
  } catch {
    return null;
  }
}

export function setConsent(analytics: boolean) {
  const c: Consent = { v: 1, analytics, at: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {}
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }));
}

/** As métricas só rodam com o "sim" da pessoa (e sem o "Não rastrear" do navegador). */
export const analyticsAllowed = (): boolean => typeof navigator !== "undefined" && navigator.doNotTrack !== "1" && getConsent()?.analytics === true;
