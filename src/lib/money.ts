/**
 * Moedas do Pinz: reais (Mercado Pago, América Latina e Portugal) e dólares (Stripe, demais países).
 * Os preços em reais ficam em lib/plans.ts; cada um tem o seu preço em dólar aqui. Troque os valores desta tabela para mudar os preços em dólar.
 */
/** Moedas cobradas pela Stripe (todas conferidas na conta: a Stripe aceitou criar o pagamento em cada uma). O Mercado Pago só cobra reais. */
export const CURRENCIES = [
  "BRL", "USD", "EUR", "GBP", "MXN", "CAD", "AUD", "NZD", "JPY", "KRW", "CNY", "INR", "IDR", "THB", "VND", "TRY", "PLN", "CZK", "SEK", "NOK", "DKK", "CHF",
  "AED", "SAR", "EGP", "ZAR", "SGD", "HKD", "TWD", "PHP", "MYR", "UAH", "ILS", "CLP", "PEN", "COP",
] as const;
export type Currency = (typeof CURRENCIES)[number];
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

/** Moedas sem centavos (a Stripe recebe o valor inteiro, sem multiplicar por 100). */
const ZERO_DECIMAL = new Set<Currency>(["JPY", "KRW", "VND", "CLP"]);
const decimalsOf = (c: Currency) => (ZERO_DECIMAL.has(c) ? 0 : 2);

/**
 * Quanto vale 1 dólar em cada moeda (valores fixos: o preço não muda a cada dia; ajuste aqui de tempos em tempos) e o passo do arredondamento
 * em unidades da moeda (preços "redondos": ¥450, ₩4.100, ₹250…). Sem passo: x,x9 (ex.: 2,79 €).
 */
const RATES: Record<Exclude<Currency, "BRL" | "USD">, { perUsd: number; step?: number }> = {
  EUR: { perUsd: 0.92 }, GBP: { perUsd: 0.79 }, MXN: { perUsd: 18, step: 1 }, CAD: { perUsd: 1.38 }, AUD: { perUsd: 1.52 }, NZD: { perUsd: 1.65 },
  JPY: { perUsd: 150, step: 10 }, KRW: { perUsd: 1380, step: 100 }, CNY: { perUsd: 7.2, step: 1 }, INR: { perUsd: 84, step: 1 }, IDR: { perUsd: 16000, step: 1000 },
  THB: { perUsd: 35, step: 1 }, VND: { perUsd: 25000, step: 1000 }, TRY: { perUsd: 34, step: 1 }, PLN: { perUsd: 4, step: 1 }, CZK: { perUsd: 23, step: 1 },
  SEK: { perUsd: 10.5, step: 1 }, NOK: { perUsd: 10.8, step: 1 }, DKK: { perUsd: 6.9, step: 1 }, CHF: { perUsd: 0.88 }, AED: { perUsd: 3.67, step: 1 },
  SAR: { perUsd: 3.75, step: 1 }, EGP: { perUsd: 49, step: 1 }, ZAR: { perUsd: 18, step: 1 }, SGD: { perUsd: 1.34 }, HKD: { perUsd: 7.8, step: 1 },
  TWD: { perUsd: 32, step: 1 }, PHP: { perUsd: 57, step: 1 }, MYR: { perUsd: 4.4, step: 1 }, UAH: { perUsd: 41, step: 1 }, ILS: { perUsd: 3.7, step: 1 },
  CLP: { perUsd: 950, step: 10 }, PEN: { perUsd: 3.75, step: 1 }, COP: { perUsd: 4100, step: 100 },
};

/**
 * O preço (em unidades menores da moeda, o que a Stripe recebe) a partir do preço em reais: reais é o próprio preço, dólar vem da tabela acima e as outras moedas
 * são o dólar convertido e arredondado para um preço "redondo".
 */
export const priceIn = (brlCents: number, currency: Currency): number => {
  if (currency === "BRL") return brlCents;
  const usd = usdCentsFor(brlCents);
  if (currency === "USD") return usd;
  const { perUsd, step } = RATES[currency];
  const v = (usd / 100) * perUsd; // valor na moeda, em unidades
  const dec = decimalsOf(currency);
  let major = step ? Math.max(step, Math.round(v / step) * step) : Math.round(v * 10) / 10;
  if (!step) major = Math.max(0.5, major) - 0.01; // x,x9
  return Math.max(dec ? 50 : 1, Math.round(major * 10 ** dec));
};

const EURO = new Set(["AT", "BE", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES", "HR", "AD", "MC", "SM", "VA", "ME", "XK"]);
const BY_COUNTRY: Record<string, Currency> = {
  BR: "BRL", GB: "GBP", MX: "MXN", CA: "CAD", AU: "AUD", NZ: "NZD", JP: "JPY", KR: "KRW", CN: "CNY", IN: "INR", ID: "IDR", TH: "THB", VN: "VND", TR: "TRY",
  PL: "PLN", CZ: "CZK", SE: "SEK", NO: "NOK", DK: "DKK", CH: "CHF", LI: "CHF", AE: "AED", SA: "SAR", EG: "EGP", ZA: "ZAR", SG: "SGD", HK: "HKD", TW: "TWD",
  PH: "PHP", MY: "MYR", UA: "UAH", IL: "ILS", CL: "CLP", PE: "PEN", CO: "COP",
};

/** Moeda da cobrança pelo país (cabeçalho da Cloudflare): a moeda local nos países atendidos, euro na zona do euro e dólar americano em todo o resto. */
export const currencyForCountry = (country: string | null | undefined): Currency => {
  const cc = (country ?? "").toUpperCase();
  if (EURO.has(cc)) return "EUR";
  return BY_COUNTRY[cc] ?? "USD";
};

/** "R$ 9,90" / "$2.99" / "¥450": o valor em unidades menores (centavos), no formato do idioma. */
export const formatMoney = (minor: number, currency: Currency, tag: string): string => {
  const v = minor / 10 ** decimalsOf(currency);
  const whole = currency !== "BRL" && currency !== "USD" && !!RATES[currency as keyof typeof RATES]?.step; // moedas de preço redondo (¥450, ₹251, MX$54) não mostram os zeros dos centavos
  return v.toLocaleString(tag, { style: "currency", currency, ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}) });
};
