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
export const formatsFor = (plan: PlanId) => PLANS[plan].formats;
export const canUseCapsule = (plan: PlanId) => PLANS[plan].capsule;

/** Pacotes de créditos (valores iniciais). A compra real ainda não existe. */
export const CREDIT_PACKS: readonly { credits: number; price: string; note?: string }[] = [
  { credits: 3, price: "R$ 3" },
  { credits: 11, price: "R$ 10", note: "+1 de bônus" },
  { credits: 29, price: "R$ 25", note: "+4 de bônus" },
  { credits: 60, price: "R$ 50", note: "+10 de bônus" },
];

/** Custo, em créditos, de abrir um novo mural (quando os créditos existirem). */
export const NEW_MURAL_COST = 5;

/** Recursos listados nos planos (apenas informativo). */
export const FULL_EXTRAS = ["Música, Vídeo, Voz e Local", "Cápsulas PINZ", "Futuras personalizações", "Futuras estatísticas avançadas"] as const;
