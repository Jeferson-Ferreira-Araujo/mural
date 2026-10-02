import type { Message } from "@/lib/types";

export type ViewProps = {
  messages: Message[];
  owner: string;
  tagline: string;
  question: string;
  stats: { visited: number; tried: number; correct: number; messages: number };
  unlocked: boolean;
  onUnlock: () => void;
  onNotify: (msg: string) => void;
};
