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
export function layoutSlots(items: BoardItem[], capacity: number = BOARD_CAPACITY): (BoardItem | null)[] {
  const out: (BoardItem | null)[] = Array.from({ length: capacity }, () => null);
  const loose: BoardItem[] = [];
  for (const it of items) {
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
export const inBoardOrder = (items: BoardItem[], capacity: number = BOARD_CAPACITY) => layoutSlots(items, capacity).filter((x): x is BoardItem => !!x);

/** Índices dos espaços já ocupados. */
export function takenSlots(items: BoardItem[], capacity: number = BOARD_CAPACITY): number[] {
  return layoutSlots(items, capacity).flatMap((it, i) => (it ? [i] : []));
}
