import type { Message } from "@/lib/types";

type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Mensagem ainda sem id (o id nasce quando ela é colada no mural). */
export type DraftMessage = DistOmit<Message, "id" | "fromCapsule">;

/** Onde o pin entra no mural livre. */
export type PinPlace = { ox: number; oy: number; cov: number[] };

/** O que o visitante envia: a mensagem e, no PINZ+, uma data de abertura (Cápsula PINZ). */
export type SendPayload = { message: DraftMessage; capsuleAt?: string; /** espaço do quadro escolhido */ slot: number; /** mural livre: ponto escolhido (deslocamento a partir do espaço âncora, em "em" do quadro) e espaços vizinhos que o pin cobre */ place?: PinPlace; };

/**
 * O formulário avisa a cada mudança. `meta.empty` = ainda falta preencher (a prévia mostra um exemplo, mas não dá para enviar).
 * `null` = nada para mostrar ainda (a prévia usa um exemplo do formato).
 */
export type DraftChange = (draft: DraftMessage | null, meta?: { empty?: boolean }) => void;
