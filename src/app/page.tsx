import type { Metadata } from "next";
import { Mural } from "@/components/Mural";
import { boardInfo, messages } from "@/data/mock";

export const metadata: Metadata = { title: "Mural do Jeferson (demonstração)" };

/** Página inicial: mural de demonstração (dados fictícios). */
export default function Home() {
  return <Mural {...boardInfo} messages={messages} />;
}
