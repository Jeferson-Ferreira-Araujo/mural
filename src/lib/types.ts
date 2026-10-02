export type PostItColor = "yellow" | "pink" | "green" | "orange" | "blue";

type Base = {
  id: string;
  /** Veio de uma Cápsula PINZ que já abriu. */
  fromCapsule?: boolean;
};

/** Os 6 formatos do MVP. FREE: postit, text, list, photo. FULL: + music, video. */
export type Message =
  | (Base & { type: "postit"; color: PostItColor; text: string })
  | (Base & { type: "text"; variant: "letter" | "notebook"; text: string })
  | (Base & { type: "list"; title: string; items: { text: string; done: boolean }[] })
  | (Base & { type: "photo"; caption: string; scene?: "hills" | "group" | "sunset"; src?: string })
  | (Base & { type: "music"; title: string; artist: string; caption: string; duration?: string; link?: string })
  | (Base & { type: "video"; caption: string; duration?: string; src?: string });

export type MessageType = Message["type"];

/**
 * Cápsula ainda fechada. De propósito NÃO tem nenhum campo de conteúdo (nem o formato):
 * o frontend nunca recebe o que está dentro antes da data de abertura.
 */
export type ClosedCapsuleItem = { id: string; sealed: true; opensAt: string };

/** O que ocupa um espaço do mural. */
export type BoardItem = Message | ClosedCapsuleItem;

export const isSealed = (item: BoardItem): item is ClosedCapsuleItem => "sealed" in item;

type FormatInfo = { label: string; hint: string; tier: "free" | "full" };

export const formatInfo: Record<MessageType, FormatInfo> = {
  postit: { label: "Post-it", hint: "Um recado rápido", tier: "free" },
  text: { label: "Texto", hint: "Uma folha de papel", tier: "free" },
  list: { label: "Lista", hint: "Uma listinha escrita à mão", tier: "free" },
  photo: { label: "Foto", hint: "Uma foto em Polaroid", tier: "free" },
  music: { label: "Música", hint: "Um cartão musical", tier: "full" },
  video: { label: "Vídeo", hint: "Um vídeo com play", tier: "full" },
};

export const typeLabel: Record<MessageType, string> = Object.fromEntries(
  Object.entries(formatInfo).map(([k, v]) => [k, v.label]),
) as Record<MessageType, string>;
