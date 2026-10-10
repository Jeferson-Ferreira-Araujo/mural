import { BOARD_CAPACITY } from "./plans";
import type { BoardItem } from "./types";

/** Colunas × linhas do quadro: 28 espaços = 7 × 4 (quadro de 15 = 5 × 3, o formato antigo). */
export function gridFor(capacity: number) {
  const cols = capacity > 15 ? 7 : 5;
  return { cols, rows: Math.ceil(capacity / cols) };
}

/**
 * Distribui os itens pelos espaços do quadro. Quem tem `slot` fica exatamente nele (o visitante escolhe onde colar);
 * quem não tem ocupa o primeiro espaço livre. Itens além da capacidade ficam de fora.
 */
/** Pin solto fora da grade (arrastado pelo dono): tem posição própria no quadro. */
export const isFreePin = (it: BoardItem) => typeof it.fx === "number" && typeof it.fy === "number";

/** Espaço mais próximo de uma posição livre: usado para pôr o pin solto na fila do detalhe e do carrossel. */
export function pseudoSlot(it: BoardItem, capacity: number = BOARD_CAPACITY) {
  const { cols, rows } = gridFor(capacity);
  return Math.min(rows - 1, Math.max(0, Math.floor(((it.fy ?? 0) / 100) * rows))) * cols + Math.min(cols - 1, Math.max(0, Math.floor(((it.fx ?? 0) / 100) * cols)));
}

export function layoutSlots(items: BoardItem[], capacity: number = BOARD_CAPACITY): (BoardItem | null)[] {
  const out: (BoardItem | null)[] = Array.from({ length: capacity }, () => null);
  const loose: BoardItem[] = [];
  for (const it of items) {
    if (isFreePin(it)) continue; // pin solto tem posição própria
    const s = it.slot;
    if (typeof s === "number" && s >= 0 && s < capacity && !out[s]) out[s] = it;
    else loose.push(it);
  }
  for (const it of loose) {
    const i = out.indexOf(null);
    if (i === -1) break;
    out[i] = it;
  }
  return out;
}

/** Itens na ordem do quadro (linha por linha): usado no carrossel do celular e no detalhe. */
export const inBoardOrder = (items: BoardItem[], capacity: number = BOARD_CAPACITY): BoardItem[] => {
  const grid = layoutSlots(items, capacity).flatMap((it, i) => (it ? [{ k: i, it }] : []));
  const free = items.filter(isFreePin).map((it) => ({ k: pseudoSlot(it, capacity) - 0.25, it })); // o pin solto entra perto de onde está no quadro
  return [...grid, ...free].sort((a, b) => a.k - b.k).map((x) => x.it);
};

/** Índices dos espaços já ocupados. */
export function takenSlots(items: BoardItem[], capacity: number = BOARD_CAPACITY): number[] {
  return layoutSlots(items, capacity).flatMap((it, i) => (it ? [i] : []));
}
