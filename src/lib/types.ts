export type Pos = { x: number; y: number; rot: number; z: number };

export type PostItColor = "yellow" | "pink" | "green" | "orange" | "blue";

type Base = { id: string; pos: Pos };

export type Message =
  | (Base & { type: "postit"; color: PostItColor; text: string })
  | (Base & { type: "text"; text: string; compact?: boolean })
  | (Base & { type: "photo"; caption: string })
  | (Base & { type: "video"; caption: string; duration: string })
  | (Base & { type: "audio"; caption: string; duration: string })
  | (Base & { type: "music"; title: string; artist: string });

export type MessageType = Message["type"];

export const typeLabel: Record<MessageType, string> = {
  postit: "Post-it",
  text: "Texto",
  photo: "Foto",
  video: "Vídeo",
  audio: "Áudio",
  music: "Música",
};
