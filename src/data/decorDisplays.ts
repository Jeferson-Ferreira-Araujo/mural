import { sampleFor } from "@/components/badges/StoreModal";
import type { PlacedBadge } from "@/lib/badges";
import type { BoardItem } from "@/lib/types";

/**
 * Displays de enfeite do mural de exemplo da tela de login: relógio, versículo, calendário, contagem, enquete, frase e dias juntos,
 * espalhados pelo quadro de 7 × 4 espaços. Cada um cobre alguns espaços (os pins de exemplo desses espaços saem) e não responde a toques.
 * Não há clima aqui de propósito: ele pediria a localização de quem só abriu a tela de login.
 */
const COLS = 7;
const ROWS = 4;

/** Centro de um grupo de espaços vizinhos da mesma linha, em % da área útil do quadro. */
function center(slots: number[]) {
  const cols = slots.map((s) => s % COLS);
  const row = Math.floor(slots[0] / COLS);
  const x = ((Math.min(...cols) + Math.max(...cols) + 1) / 2 / COLS) * 100;
  const y = ((row + 0.5) / ROWS) * 100;
  return { x, y };
}

type Spot = { product: string; style: string; slots: number[]; scale: number; rotation: number };

const SPOTS: Spot[] = [
  { product: "clock", style: "sunset", slots: [0, 1], scale: 200, rotation: -2 },
  { product: "bible", style: "natural", slots: [5, 6], scale: 200, rotation: 2 },
  { product: "countdown", style: "q-neon", slots: [10], scale: 150, rotation: -3 },
  { product: "calendar", style: "modern", slots: [14, 15], scale: 200, rotation: 1.5 },
  { product: "poll", style: "q-pop", slots: [19], scale: 150, rotation: 3 },
  { product: "motivation", style: "night", slots: [22, 23], scale: 200, rotation: -1.5 },
  { product: "daycount", style: "q-dusk", slots: [26], scale: 150, rotation: 2 },
];

const KEY: Record<string, number> = { bible: 1001, motivation: 1002, clock: 1003, calendar: 1005, countdown: 1008, daycount: 1009, poll: 1013 };

/** Tira dos pins de exemplo os espaços dos displays e devolve os displays prontos para a camada de bottons. */
export function decorLayout(items: BoardItem[]): { items: BoardItem[]; badges: PlacedBadge[] } {
  const covered = new Set(SPOTS.flatMap((s) => s.slots));
  const free = Array.from({ length: COLS * ROWS }, (_, i) => i).filter((i) => !covered.has(i));
  const pins = items.slice(0, free.length).map((it, i) => ({ ...it, slot: free[i] }) as BoardItem);
  const badges: PlacedBadge[] = SPOTS.map((s, i) => {
    const { x, y } = center(s.slots);
    return {
      // a enquete vai sem número para mostrar o resultado de exemplo (um número a faria buscar votos de verdade)
      id: s.product === "poll" ? "" : `decor-${i}`,
      key: KEY[s.product],
      kind: "display",
      data: sampleFor(s.product, s.style),
      slots: s.slots,
      scale: s.scale,
      rotation: s.rotation,
      x,
      y,
      mine: false,
    };
  });
  return { items: pins, badges };
}
