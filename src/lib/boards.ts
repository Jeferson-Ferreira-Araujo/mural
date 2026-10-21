import type { PlanId } from "./plans";

/** Quadros (fundos) do mural (7 no total). O primeiro é o padrão de todo mural novo. Originais em /imagens/quadro-*.png. */
export type BoardId = "cortica" | "familia" | "filmes" | "geek" | "minimalista" | "musica" | "viagens";

export type BoardInfo = {
  id: BoardId;
  name: string;
  /** Imagem otimizada (3:2) servida de /public/img. */
  image: string;
  /** Área útil do quadro dentro da imagem (em % da imagem): é onde os 28 espaços ficam. */
  cork: { left: number; top: number; width: number; height: number };
  /** Versão panorâmica (2,4:1) da mesma cena: a imagem 3:2 acima é o recorte central dela (62,5% da largura). Se existir, o desktop a usa de fundo, em tela cheia. */
  wide?: string;
  /** Tamanho dos cards neste quadro (1 = normal). Quadros com área menor usam cards menores para não ficarem grudados. */
  size: number;
};

export const BOARDS: readonly BoardInfo[] = [
  { id: "cortica", name: "Cortiça", image: "/img/quadro-desktop.webp?v=3", wide: "/img/quadro-desktop-wide.webp?v=1", cork: { left: 3.4, top: 6.8, width: 93.3, height: 75.2 }, size: 1 },
  { id: "familia", name: "Acolhedor", image: "/img/quadro-familia.webp?v=3", wide: "/img/quadro-familia-wide.webp?v=1", cork: { left: 3.8, top: 6.4, width: 92.9, height: 75.3 }, size: 1 },
  { id: "filmes", name: "Filmes", image: "/img/quadro-filmes.webp?v=3", wide: "/img/quadro-filmes-wide.webp?v=1", cork: { left: 5.6, top: 7.9, width: 88.8, height: 67.7 }, size: 1 },
  { id: "geek", name: "Game", image: "/img/quadro-geek.webp?v=3", wide: "/img/quadro-geek-wide.webp?v=1", cork: { left: 3, top: 5.6, width: 93.7, height: 75.8 }, size: 1 },
  { id: "minimalista", name: "Minimalista", image: "/img/quadro-minimalista.webp?v=3", wide: "/img/quadro-minimalista-wide.webp?v=1", cork: { left: 3.4, top: 7.3, width: 93.2, height: 74.2 }, size: 1 },
  { id: "musica", name: "Música", image: "/img/quadro-musica.webp?v=3", wide: "/img/quadro-musica-wide.webp?v=1", cork: { left: 2.5, top: 7.4, width: 94.8, height: 70.8 }, size: 1 },
  { id: "viagens", name: "Viagens", image: "/img/quadro-viagens.webp?v=3", wide: "/img/quadro-viagens-wide.webp?v=1", cork: { left: 3.5, top: 7.4, width: 93, height: 74.2 }, size: 1 },
];

/** Versão pequena do fundo (480 px), gerada sozinha por scripts/board-thumbs.mjs a cada build: só para fundos DESFOCADOS (o mural em si usa sempre a imagem grande). */
export const boardImageS = (b: BoardInfo) => b.image.replace(/.webp/, "-s.webp");

/** Quanto a cena panorâmica passa de cada lado do quadro 3:2, em unidades do mundo do mural (1200×800): (1920 − 1200) / 2. */
export const WIDE_EXTRA = 360;

/** Imagem para mostrar o quadro INTEIRO (a cena panorâmica 2,4:1, com o cenário dos lados) em miniaturas e listas; sem ela, o recorte do mural. */
export const boardPreview = (b: BoardInfo) => b.wide ?? b.image;

export const DEFAULT_BOARD: BoardId = "cortica";

export const boardById = (id?: string | null): BoardInfo => BOARDS.find((b) => b.id === id) ?? BOARDS[0];

/** Trocar o fundo é do PINZ+ ou de quem já comprou créditos. (Cobrança real ainda não existe.) */
export const canChangeBoard = (plan: PlanId, credits: number) => plan === "full" || credits > 0;

/** Murais lançados mais recentemente, do mais novo para o mais antigo: ganham o selo "Novo" e aparecem primeiro na loja. Ao lançar um mural, coloque-o no começo desta lista (e tire os mais velhos). */
export const NEW_BOARDS: readonly BoardId[] = ["viagens", "musica"];
