import type { Message } from "@/lib/types";

type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Mensagem ainda sem id (o id nasce quando ela é colada no mural). */
export type DraftMessage = DistOmit<Message, "id" | "fromCapsule">;

/** O que o visitante envia: a mensagem e, no FULL, uma data de abertura (Cápsula PINZ). */
export type SendPayload = { message: DraftMessage; capsuleAt?: string; /** espaço do quadro escolhido */ slot: number };

export type DraftChange = (draft: DraftMessage | null) => void;
