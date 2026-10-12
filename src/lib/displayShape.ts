/**
 * Formato de um display: retangular (2:1, o de sempre) ou quadrado (1:1).
 * O formato vem no próprio id do estilo: "q-" na frente quer dizer quadrado ("flip" é o retangular, "q-flip" o quadrado do mesmo estilo).
 * Só os displays de números e imagens (relógio, clima, calendários, contadores) têm as duas versões; os de frase e versículo são sempre retangulares.
 */
export type Shape = "wide" | "square" | "tall";

export const SQUARE_PREFIX = "q-";
/** Vertical (display de leitura de livro): "t-" na frente. */
export const TALL_PREFIX = "t-";

export const shapeOfStyle = (style?: string | null): Shape => (style?.startsWith(SQUARE_PREFIX) ? "square" : style?.startsWith(TALL_PREFIX) ? "tall" : "wide");
/** O estilo sem o formato ("q-flip" → "flip"). */
export const baseStyle = (style?: string | null): string => (style ?? "").replace(/^[qt]-/, "");
/** O mesmo estilo no formato pedido. */
export const withShape = (style: string, shape: Shape): string => (shape === "square" ? SQUARE_PREFIX + baseStyle(style) : shape === "tall" ? TALL_PREFIX + baseStyle(style) : baseStyle(style));

/** Produtos que têm as duas versões, retangular e quadrada. */
export const SHAPED_PRODUCTS: ReadonlySet<string> = new Set(["clock", "weather", "calendar", "date", "countdown", "daycount"]);
export const hasShapes = (product: string) => SHAPED_PRODUCTS.has(product);

/** Largura do desenho do widget na própria fonte (em em): o retangular é 24 × 12, o quadrado 12 × 12 e o vertical 12 × 18. */
export const NATURAL_W: Record<Shape, number> = { wide: 24, square: 12, tall: 12 };
/** Largura do display no quadro (em em do quadro), no tamanho mínimo: o quadrado é menor, para ocupar uma área parecida. */
export const BOARD_EM: Record<Shape, number> = { wide: 14, square: 8.4, tall: 8.4 };
/** Largura ÷ altura. */
export const RATIO: Record<Shape, number> = { wide: 2, square: 1, tall: 2 / 3 };

export const SHAPE_LABEL: Record<Shape, string> = { wide: "Retangular", square: "Quadrado", tall: "Vertical" };
