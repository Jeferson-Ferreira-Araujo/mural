import type { Metadata } from "next";
import { Explorer } from "@/components/Explorer";

export const metadata: Metadata = { title: "Pinz — murais de recados anônimos" };

/** Página inicial: busca uma pessoa pelo nickname e desbloqueia o mural respondendo a pergunta. */
export default function Home() {
  return <Explorer />;
}
