/** Categorias dos Bottons na loja (cada botton está em exatamente uma). */
export const BADGE_CATEGORIES = [
  { id: "fofo", label: "Fofo" },
  { id: "natureza", label: "Natureza" },
  { id: "viagens", label: "Viagens" },
  { id: "musica", label: "Música" },
  { id: "filmes", label: "Filmes e Fotos" },
  { id: "games", label: "Games" },
  { id: "esportes", label: "Esportes" },
  { id: "comida", label: "Comida" },
  { id: "diversos", label: "Diversos" },
] as const;

export type BadgeCategoryId = (typeof BADGE_CATEGORIES)[number]["id"];

const GROUPS: Record<BadgeCategoryId, number[]> = {
  fofo: [1, 2, 4, 10, 11, 18, 19, 26, 27, 28, 29, 46, 47, 48, 49, 75],
  natureza: [5, 8, 9, 13, 22, 24, 25, 30, 31, 32, 33, 34, 36, 37, 38, 39, 40, 41, 59, 72, 78],
  viagens: [17, 20, 58, 60, 61, 62, 63, 64, 65, 74],
  musica: [16, 21, 53, 54, 55, 56],
  filmes: [3, 57, 67, 68, 70, 76],
  games: [7, 50, 51, 52],
  esportes: [77, 79, 80, 81],
  comida: [12, 15, 42, 43, 44, 45, 69, 71],
  diversos: [6, 14, 23, 35, 66, 73],
};

export const BADGE_CATEGORY: Record<number, BadgeCategoryId> = Object.fromEntries(
  (Object.entries(GROUPS) as [BadgeCategoryId, number[]][]).flatMap(([cat, keys]) => keys.map((k) => [k, cat])),
);

/** "Novos": os últimos Bottons adicionados à loja (os de maior número). */
export const NEW_BADGES_COUNT = 12;

/**
 * Bottons da loja que são cópias (mesma arte) de um dos 25 primeiros, que já vêm de graça/PINZ+: não aparecem na loja
 * (quem já comprou um deles continua vendo e usando). Correspondência: 26=1, 27=2, 28=4, 31=13, 33=25, 34=9, 36=24, 41=22, 42=15, 50=7, 55=21, 58=17, 66=23.
 */
export const STORE_DUPLICATES: ReadonlySet<number> = new Set([26, 27, 28, 31, 33, 34, 36, 41, 42, 50, 55, 58, 66]);
