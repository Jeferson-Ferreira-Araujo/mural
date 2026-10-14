import { sampleFor } from "@/components/badges/StoreModal";
import { WIDGET_STYLES } from "@/components/widgets";
import { BADGE_EM, BADGE_OK_TYPES, BADGES, type PlacedBadge } from "@/lib/badges";
import { hasShapes, withShape } from "@/lib/displayShape";
import { isMessage, type BoardItem } from "@/lib/types";

/**
 * Displays de enfeite do mural de exemplo da tela de login. A cada carregamento sorteia quais displays aparecem, em que estilo e formato
 * (retangular ou quadrado) e onde ficam no quadro de 7 × 4 espaços, sem nenhum encostar no outro, para o mural parecer arrumado e diferente para cada pessoa.
 * Cada um cobre alguns espaços (os pins de exemplo desses espaços saem) e não responde a toques.
 * Não há clima nem livro aqui de propósito: o clima pediria a localização de quem só abriu a tela de login e o livro precisa de uma capa.
 */
/** Nomes de usuário inventados (com números no fim, para não coincidir com gente de verdade) que assinam os pins do mural de exemplo. */
const HANDLES = [
  "ana_luiza92", "bruno_rocha07", "carol_lima21", "dudu_alves88", "fer_matos15", "gabi_souza33", "hugo_pires04", "isa_camargo19", "joao_vitor66", "kau_ribeiro12",
  "lari_gomes58", "mateus_cruz71", "nanda_reis27", "otavio_lins09", "paula_dias44", "rafa_moura30", "sara_neves82", "thiago_luz16", "vivi_castro53", "yuri_batista25",
  "bia_santos61", "caio_freitas38", "duda_ramos47", "enzo_falcao90", "flavia_ceu14", "gui_teixeira77", "helena_mar23", "igor_prado68", "julia_flor05", "leo_barros41",
  "malu_arruda36", "nico_vidal59", "olivia_sol18", "pedro_lago72", "quel_viana29", "rubens_paz84", "sofia_brito10", "tati_melo95", "vini_costa02", "wesley_dantas63",
];

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
  const names = shuffle(HANDLES);
  const pins = items.slice(0, free.length).map((it, i) => ({ ...it, slot: free[i], ...(isMessage(it) ? { signedBy: names[i % names.length] } : {}) }) as BoardItem);
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
  // 15 bottons de tamanhos variados, nas emendas dos espaços (cantos e meios das bordas), sem um tocar no outro; as regras do mural valem
  // (um botton só fica sobre foto, post-it ou papel; nunca sobre outros pins, display nem outro botton; sempre dentro do quadro)
  const points: { x: number; y: number }[] = [];
  for (let rr = 0; rr <= ROWS; rr++) for (let cc = 0; cc <= COLS; cc++) points.push({ x: (cc / COLS) * 100, y: (rr / ROWS) * 100 });
  for (let rr = 0; rr <= ROWS; rr++) for (let cc = 0; cc < COLS; cc++) points.push({ x: ((cc + 0.5) / COLS) * 100, y: (rr / ROWS) * 100 });
  for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc <= COLS; cc++) points.push({ x: (cc / COLS) * 100, y: ((rr + 0.5) / ROWS) * 100 });
  const SCALES = [100, 100, 120, 120, 140, 140, 160, 180, 200];
  // área de cada display (os espaços que ele cobre, em % do quadro): nenhum botton encosta nela
  const displayAreas = spots.map((sp) => {
    const cols = sp.slots.map((x) => x % COLS);
    const row = Math.floor(sp.slots[0] / COLS);
    return { l: (Math.min(...cols) / COLS) * 100, r: ((Math.max(...cols) + 1) / COLS) * 100, t: (row / ROWS) * 100, b: ((row + 1) / ROWS) * 100 };
  });
  // o tipo do pin de cada espaço: o botton só pode tocar fotos, post-its e papéis
  const typeAt = new Map<number, string>();
  for (const p of pins) if (typeof p.slot === "number") typeAt.set(p.slot, isMessage(p) ? p.type : "capsule");
  const touchesOnlyOk = (x: number, y: number, w: number, h: number) => {
    const c0 = Math.floor(((x - (w * 0.8) / 2) / 100) * COLS);
    const c1 = Math.floor(((x + (w * 0.8) / 2) / 100) * COLS);
    const r0 = Math.floor(((y - (h * 0.8) / 2) / 100) * ROWS);
    const r1 = Math.floor(((y + (h * 0.8) / 2) / 100) * ROWS);
    for (let rr = Math.max(0, r0); rr <= Math.min(ROWS - 1, r1); rr++) {
      for (let cc = Math.max(0, c0); cc <= Math.min(COLS - 1, c1); cc++) {
        const t = typeAt.get(rr * COLS + cc);
        if (t !== undefined && !BADGE_OK_TYPES.has(t)) return false;
      }
    }
    return true;
  };
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const buttons: PlacedBadge[] = [];
  const keys = shuffle(BADGES);
  for (const p of shuffle(points)) {
    if (buttons.length >= 15) break;
    const def = keys[buttons.length];
    const scale = pick(SCALES);
    const w = ((BADGE_EM * scale) / 100) * 1.02; // largura em % do quadro (1 em ≈ 1% da largura)
    const h = (w / def.ratio) * 1.6; // altura em % do quadro (o quadro é mais largo que alto)
    const x = Math.min(96 - w / 2, Math.max(4 + w / 2, p.x + (Math.random() * 2 - 1)));
    const y = Math.min(94 - h / 2, Math.max(6 + h / 2, p.y + (Math.random() * 2 - 1)));
    if (displayAreas.some((d) => x + w / 2 > d.l && x - w / 2 < d.r && y + h / 2 > d.t && y - h / 2 < d.b)) continue; // botton nunca fica sobre display
    if (!touchesOnlyOk(x, y, w, h)) continue; // botton nunca fica sobre mapa, vídeo, música, voz, desenho ou cápsula
    if (placed.some((o) => Math.abs(o.x - x) < ((o.w + w) / 2) * 1.2 && Math.abs(o.y - y) < ((o.h + h) / 2) * 1.2)) continue;
    placed.push({ x, y, w, h });
    buttons.push({ id: `decor-b${buttons.length}`, key: def.key, kind: "badge", x, y, scale, rotation: Math.round(Math.random() * 30 - 15), mine: false });
  }
  return { items: pins, badges: [...badges, ...buttons] };
}
