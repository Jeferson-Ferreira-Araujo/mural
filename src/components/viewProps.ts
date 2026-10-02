import type { UnlockResult } from "@/lib/mural";
import type { Message } from "@/lib/types";

export type ViewProps = {
  messages: Message[];
  owner: string;
  prefix: "do" | "da" | "de";
  tagline: string;
  question: string;
  stats: { visited: number; tried: number; correct: number; messages: number };
  unlocked: boolean;
  onSubmitAnswer: (answer: string) => Promise<UnlockResult>;
  /** true quando é o mural de demonstração (dados fictícios). */
  demo: boolean;
  onNotify: (msg: string) => void;
};
