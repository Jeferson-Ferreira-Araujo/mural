"use client";

import { useEffect, useRef, useState } from "react";
import { stripeClientSecret } from "@/lib/payments";
import { useLit } from "@/i18n/literal";

type EmbeddedCheckout = { mount: (el: HTMLElement) => void; destroy: () => void };
type StripeJs = {
  createEmbeddedCheckoutPage?: (o: { fetchClientSecret: () => Promise<string> }) => Promise<EmbeddedCheckout>;
  initEmbeddedCheckout?: (o: { fetchClientSecret: () => Promise<string> }) => Promise<EmbeddedCheckout>;
};
declare global {
  interface Window {
    Stripe?: (key: string) => StripeJs;
  }
}

const SCRIPT = "https://js.stripe.com/v3";
let loading: Promise<void> | null = null;

/** Carrega o Stripe.js (só quando a pessoa chega ao pagamento). */
function loadStripeJs(): Promise<void> {
  if (window.Stripe) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("stripe.js"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Pagamento da Stripe DENTRO do Pinz (Embedded Checkout): cartão, Pix e carteiras (Apple Pay / Google Pay), conforme o país e o que estiver ativo no painel.
 * A pessoa não sai do site; ao terminar, a Stripe leva à página /pagamento do Pinz, que libera o que foi comprado.
 */
export function StripeEmbed({ product, recipient }: { product: string; recipient?: string }) {
  const tl = useLit();
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    let checkout: EmbeddedCheckout | null = null;
    (async () => {
      try {
        const cfg = (await fetch("/api/pay/stripe/config", { cache: "no-store" }).then((r) => r.json())) as { publishableKey?: string };
        if (!cfg.publishableKey) throw new Error("config");
        await loadStripeJs();
        const stripe = window.Stripe?.(cfg.publishableKey);
        const create = stripe?.createEmbeddedCheckoutPage ?? stripe?.initEmbeddedCheckout;
        if (!stripe || !create) throw new Error("stripe");
        let failed: string | null = null;
        const c = await create.call(stripe, {
          fetchClientSecret: async () => {
            const r = await stripeClientSecret(product, recipient);
            if ("error" in r) {
              failed = r.error;
              throw new Error(r.error);
            }
            return r.secret;
          },
        });
        if (!alive || !box.current) return c.destroy();
        checkout = c;
        c.mount(box.current);
        setReady(true);
        if (failed) setError(failed);
      } catch (e) {
        if (alive) setError(e instanceof Error && e.message && !["config", "stripe", "stripe.js"].includes(e.message) ? e.message : "Não foi possível abrir o pagamento agora. Tente de novo.");
      }
    })();
    return () => {
      alive = false;
      try {
        checkout?.destroy();
      } catch {}
    };
  }, [product, recipient]);

  return (
    <div>
      {!ready && !error && <p className="py-6 text-center text-sm text-[#6b5440]">{tl("Abrindo o pagamento…")}</p>}
      {error && (
        <p role="alert" className="rounded-xl bg-[#fde8e4] px-3 py-2 text-sm text-[#8a2a1c]">
          {tl(error)}
        </p>
      )}
      <div ref={box} className="min-h-0 overflow-hidden rounded-xl" />
    </div>
  );
}
