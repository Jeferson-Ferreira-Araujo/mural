import type { MessageType } from "./types";

/**
 * Modelo comercial do Pinz (ainda SEM cobrança real).
 * Quem VISITA um mural nunca paga: os limites abaixo valem para o PROPRIETÁRIO do mural.
 */

/** Cada mural comporta, no máximo, 15 mensagens (limite físico do produto: a lousa não cresce). */
export const BOARD_CAPACITY = 15;

export type PlanId = "free" | "full";

export type PlanInfo = {
  id: PlanId;
  name: string;
  /** Espaços liberados dos 15 do mural. */
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
    slots: 5,
    formats: ["postit", "text", "list", "photo"],
    capsule: false,
    murals: 1,
    price: "Grátis",
  },
  full: {
    id: "full",
    name: "PINZ FULL",
    slots: 15,
    formats: ["postit", "text", "list", "photo", "music", "video", "voice", "place"],
    capsule: true,
    murals: 1,
    price: "R$ 9,90/mês",
  },
};

export const slotsFor = (plan: PlanId) => PLANS[plan].slots;
export const formatsFor = (plan: PlanId) => PLANS[plan].formats;
export const canUseCapsule = (plan: PlanId) => PLANS[plan].capsule;

/** Pacotes de créditos (valores iniciais). A compra real ainda não existe. */
export const CREDIT_PACKS = [
  { credits: 5, price: "R$ 4,90" },
  { credits: 12, price: "R$ 9,90" },
  { credits: 30, price: "R$ 19,90" },
] as const;

/** Custo, em créditos, de abrir um novo mural (quando os créditos existirem). */
export const NEW_MURAL_COST = 5;

/** Recursos listados nos planos (apenas informativo). */
export const FULL_EXTRAS = ["Música, Vídeo, Voz e Local", "Cápsulas PINZ", "Futuras personalizações", "Futuras estatísticas avançadas"] as const;
