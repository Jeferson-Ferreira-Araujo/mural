import type { PlanId } from "./plans";

/** Quadros (fundos) do mural. O primeiro é o padrão de todo mural novo. Originais em /imagens/quadro-*.png. */
export type BoardId = "cortica" | "criativo" | "geek" | "leitura" | "minimalista";

export type BoardInfo = {
  id: BoardId;
  name: string;
  /** Imagem otimizada (3:2) servida de /public/img. */
  image: string;
  /** Área útil do quadro dentro da imagem (em % da imagem): é onde os 15 espaços ficam. */
  cork: { left: number; top: number; width: number; height: number };
};

export const BOARDS: readonly BoardInfo[] = [
  { id: "cortica", name: "Cortiça", image: "/img/quadro-desktop.webp", cork: { left: 11.2, top: 8, width: 79.4, height: 76.2 } },
  { id: "criativo", name: "Criativo", image: "/img/quadro-criativo.webp", cork: { left: 12.6, top: 9.2, width: 75.4, height: 69.5 } },
  { id: "geek", name: "Geek", image: "/img/quadro-geek.webp", cork: { left: 12.9, top: 8.2, width: 76, height: 71.1 } },
  { id: "leitura", name: "Leitura", image: "/img/quadro-leitura.webp", cork: { left: 15.5, top: 9.3, width: 68.4, height: 65.6 } },
  { id: "minimalista", name: "Minimalista", image: "/img/quadro-minimalista.webp", cork: { left: 12.4, top: 9.3, width: 76.2, height: 69.4 } },
];

export const DEFAULT_BOARD: BoardId = "cortica";

export const boardById = (id?: string | null): BoardInfo => BOARDS.find((b) => b.id === id) ?? BOARDS[0];

/** Trocar o fundo é do PINZ FULL ou de quem já comprou créditos. (Cobrança real ainda não existe.) */
export const canChangeBoard = (plan: PlanId, credits: number) => plan === "full" || credits > 0;
