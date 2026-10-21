/**
 * Moedas do Pinz: reais (Mercado Pago, América Latina e Portugal) e dólares (Stripe, demais países).
 * Os preços em reais ficam em lib/plans.ts; cada um tem o seu preço em dólar aqui. Troque os valores desta tabela para mudar os preços em dólar.
 */
export type Currency = "BRL" | "USD" | "EUR" | "GBP" | "MXN" | "CAD" | "AUD";
export const CURRENCIES: readonly Currency[] = ["BRL", "USD", "EUR", "GBP", "MXN", "CAD", "AUD"];
export const isCurrency = (c: unknown): c is Currency => typeof c === "string" && (CURRENCIES as readonly string[]).includes(c);
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

/** Quanto vale 1 dólar em cada moeda (valores fixos: o preço não muda a cada dia; ajuste aqui de tempos em tempos). */
const PER_USD: Record<Exclude<Currency, "BRL" | "USD">, number> = { EUR: 0.92, GBP: 0.79, MXN: 18, CAD: 1.38, AUD: 1.52 };

/** O preço (em centavos) na moeda pedida, a partir do preço em reais: reais é o próprio preço, dólar vem da tabela acima e as outras moedas são o dólar convertido e arredondado para um preço "redondo" (x,x9). */
export const priceIn = (brlCents: number, currency: Currency): number => {
  if (currency === "BRL") return brlCents;
  const usd = usdCentsFor(brlCents);
  if (currency === "USD") return usd;
  const v = (usd / 100) * PER_USD[currency]; // valor na moeda, em unidades
  const rounded = currency === "MXN" ? Math.round(v) : Math.round(v * 10) / 10; // pesos mexicanos: inteiro; demais: décimos
  return Math.max(50, Math.round(rounded * 100) - 1); // x,x9 (ex.: 2,79 €)
};

const EURO = new Set(["AT", "BE", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES", "HR", "AD", "MC", "SM", "VA", "ME", "XK"]);

/** Moeda da cobrança pelo país (cabeçalho da Cloudflare): reais no Brasil (cartão e Pix), euro na zona do euro, libra, peso mexicano, dólar canadense e australiano nos seus países e dólar americano em todo o resto. */
export const currencyForCountry = (country: string | null | undefined): Currency => {
  const cc = (country ?? "").toUpperCase();
  if (cc === "BR") return "BRL";
  if (EURO.has(cc)) return "EUR";
  if (cc === "GB") return "GBP";
  if (cc === "MX") return "MXN";
  if (cc === "CA") return "CAD";
  if (cc === "AU") return "AUD";
  return "USD";
};

/** "R$ 9,90" / "$2.99": o valor em centavos, no formato do idioma. */
export const formatMoney = (cents: number, currency: Currency, tag: string): string => (cents / 100).toLocaleString(tag, { style: "currency", currency });
