export type PostItColor = "yellow" | "pink" | "green" | "orange" | "blue";

type Base = { id: string };

export type Message =
  | (Base & { type: "postit"; color: PostItColor; text: string })
  | (Base & { type: "text"; variant: "letter" | "notebook"; text: string })
  | (Base & { type: "photo"; caption: string; scene: "hills" | "group" | "sunset" })
  | (Base & { type: "video"; caption: string; duration: string })
  | (Base & { type: "audio"; text: string; duration: string })
  | (Base & { type: "music"; title: string; artist: string; caption: string; duration: string })
  | (Base & { type: "list"; title: string; items: { text: string; done: boolean }[] })
  | (Base & { type: "draw"; caption: string });

export type MessageType = Message["type"];

export const typeLabel: Record<MessageType, string> = {
  postit: "Post-it",
  text: "Texto",
  photo: "Foto",
  video: "Vídeo",
  audio: "Áudio",
  music: "Música",
  list: "Lista",
  draw: "Desenho",
};

/** Filtros da barra superior (desktop). */
export const filters = [
  { id: "all", label: "Todas", types: null },
  { id: "text", label: "Textos", types: ["postit", "text"] },
  { id: "photo", label: "Fotos", types: ["photo"] },
  { id: "video", label: "Vídeos", types: ["video"] },
  { id: "audio", label: "Áudios", types: ["audio"] },
  { id: "music", label: "Músicas", types: ["music"] },
  { id: "draw", label: "Desenhos", types: ["draw"] },
  { id: "list", label: "Listas", types: ["list"] },
] as const satisfies readonly { id: string; label: string; types: readonly MessageType[] | null }[];

export type FilterId = (typeof filters)[number]["id"];
