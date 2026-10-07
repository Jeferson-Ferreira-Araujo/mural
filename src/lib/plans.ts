import type { MessageType } from "./types";

/**
 * Modelo comercial do Pinz (ainda SEM cobrança real).
 * Quem VISITA um mural nunca paga: os limites abaixo valem para o PROPRIETÁRIO do mural.
 */

/** Cada mural comporta, no máximo, 28 mensagens (7 × 4; limite físico do produto: a lousa não cresce). */
export const BOARD_CAPACITY = 28;

export type PlanId = "free" | "full";

export type PlanInfo = {
  id: PlanId;
  name: string;
  /** Espaços liberados dos 28 do mural. */
  slots: number;
  /** Formatos que os visitantes podem usar neste mural. */
  formats: readonly MessageType[];
  /** Cápsulas PINZ (mensagem que abre numa data futura). */
  capsule: boolean;
  /** Quantidade de murais incluídos no plano. */
  murals: number;
  price: string;
};

export const PLANS: Record<PlanId, PlanInfo> = {
  free: {
    id: "free",
    name: "PINZ FREE",
    slots: 15,
    formats: ["postit", "text", "list", "photo"],
    capsule: false,
    murals: 1,
    price: "Grátis",
  },
  full: {
    id: "full",
    name: "PINZ PLUS",
    slots: 28,
    formats: ["postit", "text", "list", "photo", "draw", "music", "video", "voice", "place"],
    capsule: true,
    murals: 1, // mais murais se compram com créditos (loja)
    price: "R$ 9,90/mês",
  },
};

/** Espaços liberados: no FREE são os 15 do plano; no PLUS, todos os do quadro (28). */
export const slotsFor = (plan: PlanId, capacity: number = BOARD_CAPACITY) => (plan === "full" ? capacity : Math.min(PLANS[plan].slots, capacity));
/** Pin de música (aparelho MP3): desligado por enquanto (o Spotify só toca 30 s de prévia para quem não está logado); os já criados continuam aparecendo. Ligue aqui para voltar. */
export const MUSIC_ENABLED = false;
export const formatsFor = (plan: PlanId) => PLANS[plan].formats.filter((f) => MUSIC_ENABLED || f !== "music");
/** Cápsulas PINZ (pin que abre numa data futura): desativadas por enquanto; ligue aqui quando a melhoria for lançada. */
export const CAPSULE_ENABLED = false;
export const canUseCapsule = (plan: PlanId) => CAPSULE_ENABLED && PLANS[plan].capsule;

/** Cobrança real (Mercado Pago). Só liga com NEXT_PUBLIC_PAYMENTS_ENABLED=true e as chaves no servidor. */
export const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";

/** Máximo de murais pessoais no PINZ PLUS (o banco usa o mesmo número em create_mural: troque nos dois). */
export const PLUS_MAX_MURALS = 10;

/** Mensalidade do PINZ PLUS, em centavos (o servidor usa este valor, nunca o que o navegador manda). */
export const PLUS_PRICE_CENTS = 990;

/** Pacotes de créditos. `cents` é o preço cobrado; `credits` já inclui o bônus. */
export const CREDIT_PACKS: readonly { id: string; credits: number; cents: number; price: string; note?: string }[] = [
  { id: "c3", credits: 3, cents: 300, price: "R$ 3" },
  { id: "c11", credits: 11, cents: 1000, price: "R$ 10", note: "+1 de bônus" },
  { id: "c29", credits: 29, cents: 2500, price: "R$ 25", note: "+4 de bônus" },
  { id: "c60", credits: 60, cents: 5000, price: "R$ 50", note: "+10 de bônus" },
];

/** Custo, em créditos, de abrir um novo mural (quando os créditos existirem). */
export const NEW_MURAL_COST = 5;

/** Recursos listados nos planos (apenas informativo). */
export const FULL_EXTRAS = ["Vídeo, Voz e Local", ...(CAPSULE_ENABLED ? ["Cápsulas PINZ"] : []), "Futuras personalizações", "Futuras estatísticas avançadas"];
