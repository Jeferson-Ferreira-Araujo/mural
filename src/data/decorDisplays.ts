import { sampleFor } from "@/components/badges/StoreModal";
import { WIDGET_STYLES } from "@/components/widgets";
import { BADGES, type PlacedBadge } from "@/lib/badges";
import { hasShapes, withShape } from "@/lib/displayShape";
import type { BoardItem } from "@/lib/types";

/**
 * Displays de enfeite do mural de exemplo da tela de login. A cada carregamento sorteia quais displays aparecem, em que estilo e formato
 * (retangular ou quadrado) e onde ficam no quadro de 7 × 4 espaços, sem nenhum encostar no outro, para o mural parecer arrumado e diferente para cada pessoa.
 * Cada um cobre alguns espaços (os pins de exemplo desses espaços saem) e não responde a toques.
 * Não há clima nem livro aqui de propósito: o clima pediria a localização de quem só abriu a tela de login e o livro precisa de uma capa.
 */
const COLS = 7;
const ROWS = 4;
const HOW_MANY = 7;

/** Produtos que podem aparecer. `wide`/`square`: formatos que existem; `text`: o de frase/versículo (sempre retangular). */
const POOL: { product: string; key: number; formats: ("wide" | "square")[] }[] = [
  { product: "clock", key: 1003, formats: ["wide", "square"] },
  { product: "calendar", key: 1005, formats: ["wide", "square"] },
  { product: "countdown", key: 1008, formats: ["wide", "square"] },
  { product: "daycount", key: 1009, formats: ["wide", "square"] },
  { product: "date", key: 1007, formats: ["wide", "square"] },
  { product: "top3", key: 1011, formats: ["wide", "square"] },
  { product: "poll", key: 1013, formats: ["square"] },
  { product: "bible", key: 1001, formats: ["wide"] },
  { product: "motivation", key: 1002, formats: ["wide"] },
];

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const shuffle = <T,>(a: readonly T[]): T[] => {
  const o = [...a];
  for (let i = o.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [o[i], o[j]] = [o[j], o[i]];
  }
  return o;
};

/** Os estilos que existem de cada produto (o id sem o formato). */
const stylesOf = (product: string): string[] => {
  const list = WIDGET_STYLES[product === "bible" || product === "motivation" ? "text" : product] ?? [];
  return list.map((s) => s.id);
};

type Spot = { product: string; key: number; style: string; slots: number[]; scale: number; rotation: number };

/** Centro de um grupo de espaços vizinhos da mesma linha, em % da área útil do quadro. */
function center(slots: number[]) {
  const cols = slots.map((s) => s % COLS);
  const row = Math.floor(slots[0] / COLS);
  const x = ((Math.min(...cols) + Math.max(...cols) + 1) / 2 / COLS) * 100;
  const y = ((row + 0.5) / ROWS) * 100;
  return { x, y };
}

/** Tenta encaixar todos: retangulares em 2 espaços da mesma linha, quadrados em 1. `apart`: nenhum encosta no outro (nem na diagonal). */
function place(chosen: { wide: boolean }[], apart: boolean): number[][] | null {
  const taken = new Set<number>();
  const blocked = new Set<number>();
  const out: number[][] = [];
  const order = chosen.map((c, i) => ({ ...c, i })).sort((a, b) => Number(b.wide) - Number(a.wide)); // os maiores primeiro
  const res: number[][] = Array.from({ length: chosen.length }, () => []);
  for (const it of order) {
    const options: number[][] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - (it.wide ? 1 : 0); c++) {
        const cells = it.wide ? [r * COLS + c, r * COLS + c + 1] : [r * COLS + c];
        if (cells.every((x) => !taken.has(x) && (!apart || !blocked.has(x)))) options.push(cells);
      }
    }
    if (options.length === 0) return null;
    const cells = pick(options);
    res[it.i] = cells;
    out.push(cells);
    for (const x of cells) {
      taken.add(x);
      const r = Math.floor(x / COLS);
      const c = x % COLS;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (r + dr >= 0 && r + dr < ROWS && c + dc >= 0 && c + dc < COLS) blocked.add((r + dr) * COLS + (c + dc));
    }
  }
  return res;
}

/** Sorteia os displays e tira dos pins de exemplo os espaços que eles cobrem; devolve os displays prontos para a camada de bottons. */
export function decorLayout(items: BoardItem[]): { items: BoardItem[]; badges: PlacedBadge[] } {
  let chosen: { spec: (typeof POOL)[number]; shape: "wide" | "square" }[] = [];
  let slots: number[][] | null = null;
  // várias tentativas até caber tudo com folga entre eles; se não der, aceita encostados
  for (let t = 0; t < 60 && !slots; t++) {
    chosen = shuffle(POOL)
      .slice(0, HOW_MANY)
      .map((spec) => ({ spec, shape: pick(spec.formats) }));
    if (!chosen.some((c) => c.spec.product === "bible" || c.spec.product === "motivation")) continue; // sempre um texto (versículo ou frase)
    slots = place(chosen.map((c) => ({ wide: c.shape === "wide" })), true);
  }
  if (!slots) {
    chosen = shuffle(POOL)
      .slice(0, 6)
      .map((spec) => ({ spec, shape: pick(spec.formats) }));
    slots = place(chosen.map((c) => ({ wide: c.shape === "wide" })), false) ?? [];
  }

  const spots: Spot[] = chosen.slice(0, slots.length).map((c, i) => {
    const base = pick(stylesOf(c.spec.product));
    const style = hasShapes(c.spec.product) ? withShape(base, c.shape) : c.spec.product === "poll" ? withShape(base, "square") : base;
    return { product: c.spec.product, key: c.spec.key, style, slots: slots![i], scale: c.shape === "wide" ? 200 : 150, rotation: Math.round((Math.random() * 6 - 3) * 10) / 10 };
  });

  const covered = new Set(spots.flatMap((s) => s.slots));
  const free = Array.from({ length: COLS * ROWS }, (_, i) => i).filter((i) => !covered.has(i));
  const pins = items.slice(0, free.length).map((it, i) => ({ ...it, slot: free[i] }) as BoardItem);
  const badges: PlacedBadge[] = spots.map((s, i) => {
    const { x, y } = center(s.slots);
    return {
      // a enquete vai sem número para mostrar o resultado de exemplo (um número a faria buscar votos de verdade)
      id: s.product === "poll" ? "" : `decor-${i}`,
      key: s.key,
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
  // bottons espalhados, nos cantos entre os espaços (longe dos displays e um do outro): poucos, para não poluir
  const corners: { r: number; c: number }[] = [];
  for (let rr = 1; rr < ROWS; rr++) {
    for (let cc = 1; cc < COLS; cc++) {
      const around = [(rr - 1) * COLS + cc - 1, (rr - 1) * COLS + cc, rr * COLS + cc - 1, rr * COLS + cc];
      if (around.every((x) => !covered.has(x))) corners.push({ r: rr, c: cc });
    }
  }
  const chosenCorners: { r: number; c: number }[] = [];
  for (const k of shuffle(corners)) {
    if (chosenCorners.length >= 6) break;
    if (chosenCorners.every((o) => Math.max(Math.abs(o.r - k.r), Math.abs(o.c - k.c)) >= 2)) chosenCorners.push(k);
  }
  const pins2 = shuffle(BADGES).slice(0, chosenCorners.length);
  const buttons: PlacedBadge[] = chosenCorners.map((k, i) => ({
    id: `decor-b${i}`,
    key: pins2[i].key,
    kind: "badge",
    x: (k.c / COLS) * 100 + (Math.random() * 3 - 1.5),
    y: (k.r / ROWS) * 100 + (Math.random() * 3 - 1.5),
    scale: 100 + Math.round(Math.random() * 40),
    rotation: Math.round(Math.random() * 30 - 15),
    mine: false,
  }));
  return { items: pins, badges: [...badges, ...buttons] };
}
