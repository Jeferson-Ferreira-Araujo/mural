/**
 * Moedas do Pinz: reais (Mercado Pago, América Latina e Portugal) e dólares (Stripe, demais países).
 * Os preços em reais ficam em lib/plans.ts; cada um tem o seu preço em dólar aqui. Troque os valores desta tabela para mudar os preços em dólar.
 */
export type Currency = "BRL" | "USD";
export type PayProvider = "mercadopago" | "stripe";

/** Preço em reais (centavos) → preço em dólares (centavos). */
export const USD_BY_BRL_CENTS: Record<number, number> = {
  300: 99, // 3 créditos
  1000: 299, // 11 créditos
  2500: 599, // 29 créditos
  5000: 1199, // 60 créditos
  990: 299, // PINZ+ mensal (e 1 mês avulso)
  9900: 2499, // PINZ+ anual
  24900: 5999, // PINZ+ vitalício
  790: 249, // presente de 1 mês
};

/** Centavos de dólar equivalentes a um preço em reais (centavos). */
export const usdCentsFor = (brlCents: number): number => USD_BY_BRL_CENTS[brlCents] ?? Math.max(50, Math.round(brlCents * 0.2));

/** O preço (em centavos) na moeda pedida, a partir do preço em reais. */
export const priceIn = (brlCents: number, currency: Currency): number => (currency === "USD" ? usdCentsFor(brlCents) : brlCents);

/** "R$ 9,90" / "$2.99": o valor em centavos, no formato do idioma. */
export const formatMoney = (cents: number, currency: Currency, tag: string): string => (cents / 100).toLocaleString(tag, { style: "currency", currency });
