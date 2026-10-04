import type { HandId, PinColor, TapeColor } from "./style";

export type PostItColor = "yellow" | "pink" | "green" | "orange" | "blue";

/** Cor do mini player de vídeo. */
export type PlayerColor = "black" | "silver" | "red" | "blue" | "pink" | "green" | "cream";

type Base = {
  id: string;
  /** Veio de uma Cápsula PINZ que já abriu. */
  fromCapsule?: boolean;
  /** Espaço do quadro em que o pin foi colado (escolhido por quem deixou). Sem isso, ocupa o primeiro livre. */
  slot?: number;
  /** Personalização dos cards de texto (escolhida por quem colou o pin). */
  font?: HandId;
  pin?: PinColor;
  tape?: TapeColor;
  /** Pin ainda não aprovado pelo dono: só quem enviou o vê, até a aprovação. */
  pending?: boolean;
  /** Visão do dono: este pin está em blur para quem visita (recurso FULL). */
  ownerHidden?: boolean;
  /** Nickname de quem assinou o pin. Sem isso o pin é anônimo (o autor só existe no banco). */
  signedBy?: string;
  /** Visão do dono: este pin pendente está esperando a aprovação dele. */
  ownerReview?: boolean;
};

/** Os formatos. FREE: postit, text, list, photo. FULL: + music, video, voice, place. */
export type Message =
  | (Base & { type: "postit"; color: PostItColor; text: string })
  | (Base & { type: "text"; variant: "letter" | "notebook"; text: string })
  | (Base & { type: "list"; title: string; items: { text: string; done: boolean }[] })
  | (Base & { type: "photo"; caption: string; scene?: "hills" | "group" | "sunset"; src?: string })
  | (Base & { type: "music"; title: string; artist: string; caption: string; duration?: string; link?: string; playerColor?: PlayerColor })
  | (Base & { type: "video"; caption: string; duration?: string; src?: string; playerColor?: PlayerColor })
  | (Base & { type: "voice"; caption: string; duration?: string; src?: string; playerColor?: PlayerColor })
  | (Base & { type: "place"; name: string; address: string; lat: number; lon: number; caption: string; playerColor?: PlayerColor });

export type MessageType = Message["type"];

/**
 * Cápsula ainda fechada. De propósito NÃO tem nenhum campo de conteúdo (nem o formato):
 * o frontend nunca recebe o que está dentro antes da data de abertura.
 */
export type ClosedCapsuleItem = { id: string; sealed: true; opensAt: string; slot?: number };

/**
 * Espaço ocupado cujo conteúdo o servidor NÃO enviou: pin aguardando aprovação de outra pessoa ou pin que o dono (FULL)
 * deixou em blur. Aparece como um cartão do mesmo tipo, borrado e com texto de enchimento.
 */
export type HiddenItem = {
  id: string;
  slot?: number;
  hidden: true;
  pending?: boolean;
  /** Só o tipo e o estilo visual: o conteúdo nunca vem. */
  type?: MessageType;
  color?: PostItColor;
  variant?: "letter" | "notebook";
  playerColor?: PlayerColor;
  font?: HandId;
  pin?: PinColor;
  tape?: TapeColor;
};

/** O que ocupa um espaço do mural. */
export type BoardItem = Message | ClosedCapsuleItem | HiddenItem;

export const isSealed = (item: BoardItem): item is ClosedCapsuleItem => "sealed" in item;
export const isHidden = (item: BoardItem): item is HiddenItem => "hidden" in item;
/** Pin com conteúdo de verdade (nem cápsula fechada, nem espaço em blur). */
export const isMessage = (item: BoardItem): item is Message => !isSealed(item) && !isHidden(item);

type FormatInfo = { label: string; hint: string; tier: "free" | "full" };

export const formatInfo: Record<MessageType, FormatInfo> = {
  postit: { label: "Post-it", hint: "Um recado rápido", tier: "free" },
  text: { label: "Texto", hint: "Uma folha de papel", tier: "free" },
  list: { label: "Lista", hint: "Uma listinha escrita à mão", tier: "free" },
  photo: { label: "Foto", hint: "Uma foto em Polaroid", tier: "free" },
  music: { label: "Música", hint: "Um mini MP3 player", tier: "full" },
  video: { label: "Vídeo", hint: "Um vídeo no seu mini player", tier: "full" },
  voice: { label: "Voz", hint: "Uma mensagem de voz", tier: "full" },
  place: { label: "Local", hint: "Um lugar no mapa", tier: "full" },
};

export const typeLabel: Record<MessageType, string> = Object.fromEntries(
  Object.entries(formatInfo).map(([k, v]) => [k, v.label]),
) as Record<MessageType, string>;
