"use client";

import { useEffect, useState } from "react";
import { useTag } from "@/i18n/useTag";
import { formatMoney, priceIn, type Currency, type PayProvider } from "./money";

type Info = { provider: PayProvider; currency: Currency };
const DEFAULT: Info = { provider: "mercadopago", currency: "BRL" };
let pending: Promise<Info> | null = null;

/** Qual meio de pagamento e qual moeda valem para esta pessoa (o servidor decide pelo país). Uma só consulta por visita. */
export function loadPayInfo(): Promise<Info> {
  pending ??= fetch("/api/pay/provider", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<Info>) : DEFAULT))
    .then((d) => (d.provider === "stripe" && d.currency === "USD" ? d : DEFAULT))
    .catch(() => DEFAULT);
  return pending;
}

/** Começa em reais/Mercado Pago (igual ao servidor, sem piscar) e troca para dólar/Stripe só se o servidor mandar. */
export function usePayInfo(): Info {
  const [info, setInfo] = useState<Info>(DEFAULT);
  useEffect(() => {
    let alive = true;
    void loadPayInfo().then((d) => alive && setInfo(d));
    return () => {
      alive = false;
    };
  }, []);
  return info;
}

/** `money(centavosEmReais)` devolve o preço na moeda da pessoa, já formatado. */
export function useMoney(): (brlCents: number) => string {
  const { currency } = usePayInfo();
  const tag = useTag();
  return (brlCents: number) => formatMoney(priceIn(brlCents, currency), currency, tag);
}
