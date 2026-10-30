"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";

/** Chave pública do Cloudflare Turnstile (vazia = sem captcha). Vem do servidor em tempo de execução, em app/layout.tsx. */
const KeyCtx = createContext("");
export function CaptchaKeyProvider({ siteKey, children }: { siteKey: string; children: ReactNode }) {
  return <KeyCtx.Provider value={siteKey}>{children}</KeyCtx.Provider>;
}

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((ok, fail) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => {
      loading = null;
      fail(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Captcha invisível (Cloudflare Turnstile): só aparece um desafio se o Cloudflare desconfiar da visita.
 * `box` vai num <div> dentro do formulário; `token()` devolve um código novo para mandar ao Supabase junto do pedido
 * (login, cadastro, código por e-mail, recuperação de senha). Sem chave configurada devolve undefined e nada muda.
 */
export function useCaptcha() {
  const siteKey = useContext(KeyCtx);
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const ready = useRef<string | null>(null);
  const waiting = useRef<((t: string | undefined) => void)[]>([]);

  const give = useCallback((t: string) => {
    const w = waiting.current.shift();
    if (w) {
      w(t);
      if (widget.current) window.turnstile?.reset(widget.current); // cada código vale uma vez só: já pede outro
    } else {
      ready.current = t;
    }
  }, []);

  useEffect(() => {
    if (!siteKey) return;
    let gone = false;
    loadScript()
      .then(() => {
        if (gone || !box.current || !window.turnstile) return;
        widget.current = window.turnstile.render(box.current, {
          sitekey: siteKey,
          appearance: "interaction-only",
          callback: give,
          "expired-callback": () => (ready.current = null),
          "error-callback": () => (ready.current = null),
        });
      })
      .catch(() => undefined);
    return () => {
      gone = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, give]);

  const token = useCallback(async (): Promise<string | undefined> => {
    if (!siteKey) return undefined;
    if (ready.current) {
      const t = ready.current;
      ready.current = null;
      if (widget.current) window.turnstile?.reset(widget.current);
      return t;
    }
    return new Promise<string | undefined>((resolve) => {
      const w = (t: string | undefined) => resolve(t);
      waiting.current.push(w);
      window.setTimeout(() => {
        const i = waiting.current.indexOf(w);
        if (i >= 0) {
          waiting.current.splice(i, 1);
          resolve(undefined);
        }
      }, 20000);
    });
  }, [siteKey]);

  return { on: !!siteKey, box, token };
}
