import type { PlanId } from "./plans";

/** Quadros (fundos) do mural. O primeiro é o padrão de todo mural novo. Originais em /imagens/quadro-*.png. */
export type BoardId = "cortica" | "criativo" | "geek" | "leitura" | "minimalista";

export type BoardInfo = {
  id: BoardId;
  name: string;
  /** Imagem otimizada (3:2) servida de /public/img. */
  image: string;
  /** Área útil do quadro dentro da imagem (em % da imagem): é onde os 28 espaços ficam. */
  cork: { left: number; top: number; width: number; height: number };
  /** Tamanho dos cards neste quadro (1 = normal). Quadros com área menor usam cards menores para não ficarem grudados. */
  size: number;
};

export const BOARDS: readonly BoardInfo[] = [
  { id: "cortica", name: "Cortiça", image: "/img/quadro-desktop.webp?v=2", cork: { left: 11.8, top: 8.4, width: 78.2, height: 73.4 }, size: 1 },
  { id: "criativo", name: "Criativo", image: "/img/quadro-criativo.webp?v=2", cork: { left: 12.6, top: 9.2, width: 75.4, height: 69.5 }, size: 1 },
  { id: "geek", name: "Geek", image: "/img/quadro-geek.webp", cork: { left: 12.9, top: 8.2, width: 76, height: 71.1 }, size: 1 },
  { id: "leitura", name: "Leitura", image: "/img/quadro-leitura.webp", cork: { left: 15.5, top: 9.3, width: 68.4, height: 65.6 }, size: 0.86 },
  { id: "minimalista", name: "Minimalista", image: "/img/quadro-minimalista.webp", cork: { left: 12.4, top: 9.3, width: 76.2, height: 69.4 }, size: 1 },
];

export const DEFAULT_BOARD: BoardId = "cortica";

export const boardById = (id?: string | null): BoardInfo => BOARDS.find((b) => b.id === id) ?? BOARDS[0];

/** Trocar o fundo é do PINZ PLUS ou de quem já comprou créditos. (Cobrança real ainda não existe.) */
export const canChangeBoard = (plan: PlanId, credits: number) => plan === "full" || credits > 0;
