import type { SupabaseClient } from "@supabase/supabase-js";
import type { MuralRef } from "./mural";
import type { MessageType } from "./types";

/** Pins decorativos (botons) que o dono coloca no próprio mural. Imagens em /public/img/badges (b01.webp...), recortadas da grade enviada. */
export type BadgeDef = { key: number; /** largura / altura da imagem */ ratio: number; /** nome na loja */ name?: string };

export const BADGES: readonly BadgeDef[] = [
  { key: 1, ratio: 1.021, name: "Sorriso amarelo" },
  { key: 2, ratio: 1.126, name: "Coração vermelho" },
  { key: 3, ratio: 1.126, name: "Câmera retrô" },
  { key: 4, ratio: 1.044, name: "Estrela amarela" },
  { key: 5, ratio: 1.026, name: "Pôr do sol" },
  { key: 6, ratio: 1.31, name: "Planeta" },
  { key: 7, ratio: 1.333, name: "Joystick" },
  { key: 8, ratio: 1.477, name: "Montanhas" },
  { key: 9, ratio: 0.917, name: "Cogumelo vermelho" },
  { key: 10, ratio: 1.01, name: "Coroa" },
  { key: 11, ratio: 1.01, name: "Coração rosa" },
  { key: 12, ratio: 0.934, name: "Xícara de café" },
  { key: 13, ratio: 1.025, name: "Margarida" },
  { key: 14, ratio: 1.047, name: "Good Vibes" },
  { key: 15, ratio: 1.097, name: "Fatia de pizza" },
  { key: 16, ratio: 1.021, name: "Fone de ouvido" },
  { key: 17, ratio: 1.048, name: "Mundo" },
  { key: 18, ratio: 1.021, name: "Patinha" },
  { key: 19, ratio: 1.054, name: "Coração contorno" },
  { key: 20, ratio: 1.03, name: "Aviãozinho de papel" },
  { key: 21, ratio: 1.35, name: "Fita K7" },
  { key: 22, ratio: 0.793, name: "Chama" },
  { key: 23, ratio: 1.015, name: "Pilha de livros" },
  { key: 24, ratio: 1.005, name: "Lua e estrelas" },
  { key: 25, ratio: 0.906, name: "Trevo da sorte" },
  // da loja (liberados com créditos):
  { key: 26, ratio: 0.993, name: "Sorriso" },
  { key: 27, ratio: 1.192, name: "Coração" },
  { key: 28, ratio: 1.051, name: "Estrela" },
  { key: 29, ratio: 1.173, name: "Coroa" },
  { key: 30, ratio: 1.088, name: "Cerejeira" },
  { key: 31, ratio: 1.022, name: "Margarida" },
  { key: 32, ratio: 1.014, name: "Girassol" },
  { key: 33, ratio: 1.028, name: "Trevo" },
  { key: 34, ratio: 0.935, name: "Cogumelo" },
  { key: 35, ratio: 1.000, name: "Yin-yang" },
  { key: 36, ratio: 1.015, name: "Lua" },
  { key: 37, ratio: 1.046, name: "Sol" },
  { key: 38, ratio: 1.447, name: "Nuvem" },
  { key: 39, ratio: 1.575, name: "Arco-íris" },
  { key: 40, ratio: 0.745, name: "Raio" },
  { key: 41, ratio: 0.843, name: "Fogo" },
  { key: 42, ratio: 1.087, name: "Pizza" },
  { key: 43, ratio: 1.045, name: "Hambúrguer" },
  { key: 44, ratio: 0.799, name: "Café" },
  { key: 45, ratio: 1.076, name: "Rosquinha" },
  { key: 46, ratio: 1.157, name: "Gatinho" },
  { key: 47, ratio: 1.483, name: "Cachorrinho" },
  { key: 48, ratio: 1.152, name: "Patinha" },
  { key: 49, ratio: 1.155, name: "Raposa" },
  { key: 50, ratio: 1.466, name: "Controle" },
  { key: 51, ratio: 0.775, name: "Game Boy" },
  { key: 52, ratio: 1.134, name: "Coração pixel" },
  { key: 53, ratio: 1.186, name: "Fones" },
  { key: 54, ratio: 0.879, name: "Nota musical" },
  { key: 55, ratio: 1.397, name: "Fita cassete" },
  { key: 56, ratio: 1.023, name: "Disco de vinil" },
  { key: 57, ratio: 1.318, name: "Câmera" },
  { key: 58, ratio: 1.037, name: "Planeta Terra" },
  { key: 59, ratio: 1.459, name: "Montanha" },
  { key: 60, ratio: 1.131, name: "Ilha" },
  { key: 61, ratio: 0.647, name: "Prancha" },
  { key: 62, ratio: 1.317, name: "Kombi" },
  { key: 63, ratio: 1.354, name: "Avião" },
  { key: 64, ratio: 0.956, name: "Bússola" },
  { key: 65, ratio: 1.254, name: "Mapa" },
  { key: 66, ratio: 1.152, name: "Livros" },
  { key: 67, ratio: 0.880, name: "Pipoca" },
  { key: 68, ratio: 1.096, name: "Claquete" },
  { key: 69, ratio: 0.647, name: "Refrigerante" },
  { key: 70, ratio: 2.393, name: "Óculos" },
  { key: 71, ratio: 1.339, name: "Melancia" },
  { key: 72, ratio: 0.952, name: "Cacto" },
  { key: 73, ratio: 0.771, name: "Lâmpada" },
  { key: 74, ratio: 1.660, name: "Aviãozinho" },
  { key: 75, ratio: 1.509, name: "Borboleta" },
  { key: 76, ratio: 1.081, name: "Câmera instantânea" },
  { key: 77, ratio: 1.333, name: "Skate" },
  { key: 78, ratio: 1.252, name: "Onda" },
  { key: 79, ratio: 1.023, name: "Bola de futebol" },
  { key: 80, ratio: 1.031, name: "Bola de basquete" },
  { key: 81, ratio: 1.092, name: "Troféu" },
];

export const badgeDef = (key: number) => BADGES.find((b) => b.key === key);
export const badgeSrc = (key: number) => `/img/badges/b${String(key).padStart(2, "0")}.webp`;

/** Largura de um botom no mural, em em (1em ≈ 1% da largura do quadro). */
export const BADGE_EM = 3;
/** Pins decorativos do plano gratuito (1 unidade de cada). O PINZ+ libera os 25 iniciais; os outros se compram. */
export const FREE_BADGES: readonly number[] = [1, 2, 4, 5, 9, 12, 13, 17, 22, 25];
export const MAX_BADGES = 200; // teto técnico de bottons por mural

/** Pinz "físicos" (aparelhos e cápsulas): não aceitam botom por cima. Os de papel (post-it, texto, lista, foto) aceitam. */
export const PHYSICAL_TYPES: readonly (MessageType | "capsule")[] = ["music", "video", "voice", "place", "capsule"];

/** Displays da loja (versículo, frase, relógio, clima): usam as chaves 1001 a 1007 e ficam em qualquer lugar do mural, não em um espaço. */
export const DISPLAY_KEYS: Record<string, number> = { bible: 1001, motivation: 1002, clock: 1003, weather: 1004, calendar: 1005, cookie: 1006, date: 1007 };
export const isDisplayKey = (key: number) => key >= 1000;
export const displayProductOf = (key: number) => Object.entries(DISPLAY_KEYS).find(([, k]) => k === key)?.[0];
/** Largura base de um display (em em do quadro), contra 3 de um botton comum. */
export const DISPLAY_EM = 14;
export const DISPLAY_SCALE = 100;
export const baseEmOf = (key: number) => (isDisplayKey(key) ? DISPLAY_EM : BADGE_EM);
export const ratioOfKey = (key: number) => (isDisplayKey(key) ? 2 : (badgeDef(key)?.ratio ?? 1)); // widgets: largura 2 × altura 1

export type PlacedBadge = { id: string; key: number; /** botton comum ou display da loja */ kind?: "badge" | "display"; /** dados do display (o texto do dia já vem pronto do servidor) */ data?: DisplayPayload | null; /** espaços do quadro que o display cobre (ficam sem receber pins) */ slots?: number[]; /** tamanho em % do tamanho de sempre: 100 (o menor) a 200 (o dobro) */ scale?: number; /** inclinação em graus: negativo = anti-horário, positivo = horário */ rotation?: number; /** centro, em % da área útil do quadro */ x: number; y: number; /** mural compartilhado: false = foi a outra pessoa quem colocou (só quem colocou mexe) */ mine?: boolean };

/** Botons do mural (null = sem acesso). */
export async function fetchBadges(sb: SupabaseClient, ref: MuralRef, token: string | null): Promise<PlacedBadge[] | null> {
  const { data, error } = await sb.rpc("get_badges", { p_nick: ref.nick, p_slug: ref.slug, p_token: token });
  if (error || !Array.isArray(data)) return null;
  return (data as PlacedBadge[]).map((b) => ({ ...b, x: Number(b.x), y: Number(b.y) }));
}

export type AddBadgeResult = { id: string } | { error: "sold_out" | "not_owned" | "limit" | "error" };

export async function addBadge(sb: SupabaseClient, muralId: string, key: number, x: number, y: number): Promise<AddBadgeResult> {
  const { data, error } = await sb.rpc("add_badge", { p_mural_id: muralId, p_key: key, p_x: x, p_y: y });
  if (!error && data && (data as { id?: string }).id) return { id: (data as { id: string }).id };
  const m = error?.message ?? "";
  return { error: m.includes("badge_sold_out") ? "sold_out" : m.includes("badge_not_owned") ? "not_owned" : m.includes("badge_limit") ? "limit" : "error" };
}

export type DisplayPayload = { product: string; style?: string; frame?: string; tz?: string; city?: string; lat?: number; lon?: number; text?: string; ref?: string | null; dates?: { date: string; label: string; yearly: boolean }[] };

export async function addDisplay(sb: SupabaseClient, muralId: string, product: string, data: Record<string, unknown>, x: number, y: number, slots: number[]): Promise<{ id: string } | { error: "taken" | "limit" | "not_owned" | "error" }> {
  const { data: res, error } = await sb.rpc("add_display", { p_mural_id: muralId, p_product: product, p_data: data, p_x: x, p_y: y, p_slots: slots });
  if (!error && res && (res as { id?: string }).id) return { id: (res as { id: string }).id };
  const m = error?.message ?? "";
  return { error: m.includes("slot_taken") ? "taken" : m.includes("badge_limit") ? "limit" : m.includes("product_not_owned") ? "not_owned" : "error" };
}

export async function updateDisplayData(sb: SupabaseClient, id: string, data: Record<string, unknown>): Promise<boolean> {
  const { error } = await sb.rpc("update_display", { p_id: id, p_data: data });
  return !error;
}

/** Mover ou redimensionar um display: posição, tamanho e espaços cobertos mudam juntos. */
export async function updateDisplayLayout(sb: SupabaseClient, id: string, x: number, y: number, scale: number, slots: number[]): Promise<{ ok: true } | { ok: false; taken: boolean }> {
  const { error } = await sb.rpc("update_display_layout", { p_id: id, p_x: x, p_y: y, p_scale: Math.round(scale), p_slots: slots });
  return error ? { ok: false, taken: error.message.includes("slot_taken") } : { ok: true };
}

export async function moveBadge(sb: SupabaseClient, id: string, x: number, y: number): Promise<boolean> {
  const { error } = await sb.rpc("move_badge", { p_id: id, p_x: x, p_y: y });
  return !error;
}

/** Salva o tamanho do botton já colocado, em % do padrão (50 a 150). */
export async function setBadgeScale(sb: SupabaseClient, id: string, pct: number): Promise<boolean> {
  const { error } = await sb.rpc("set_badge_scale", { p_id: id, p_scale: Math.round(pct) });
  return !error;
}

export const MIN_SCALE = 100; // o menor é o tamanho de sempre
export const MAX_SCALE = 200; // o maior é o dobro
export const DEFAULT_SCALE = (MIN_SCALE + MAX_SCALE) / 2; // o padrão é o meio da barra (150%)

/** Salva a inclinação do botton (graus; negativo = anti-horário). */
export async function setBadgeRotation(sb: SupabaseClient, id: string, deg: number): Promise<boolean> {
  const { error } = await sb.rpc("set_badge_rotation", { p_id: id, p_deg: Math.round(deg) });
  return !error;
}

export const MAX_TILT = 180; // a barra de inclinação vai de -180° a +180° (dá a volta até ficar de cabeça para baixo)

export async function removeBadge(sb: SupabaseClient, id: string): Promise<boolean> {
  const { error } = await sb.rpc("remove_badge", { p_id: id });
  return !error;
}

// ---------- estoque e loja ----------

/** Um pin do catálogo, do ponto de vista de quem está logado. */
export type CatalogItem = { key: number; /** todo mundo tem (1 unidade no FREE) */ starter: boolean; /** preço, em créditos, para liberar (pins da loja) */ price: number; /** preço de +1 unidade (FREE) */ unitPrice: number; owned: boolean; /** unidades extras compradas */ extra: number; /** quando foi comprado (segundos); sem valor = já era da conta */ acquired?: number | null };
export type BoardOffer = { id: string; price: number; owned: boolean };
/** Pin da loja (formato novo de pin, como "Mensagem do dia"). */
export type PinProduct = { id: string; name: string; description: string; price: number; owned: boolean };
export type BadgeInventory = {
  credits: number;
  /** a conta tem o plano PINZ+ (só ele compra na loja) */
  plus: boolean;
  extraMurals: number;
  muralCount: number;
  /** preço de um mural extra, em créditos */
  muralPrice: number;
  boards: BoardOffer[];
  /** pins da loja (formatos novos) */
  pinProducts?: PinProduct[];
  /** preço, em créditos, de criar um mural novo com 42 espaços (só PINZ+) */
  slotsPrice?: number;
  catalog: CatalogItem[];
  /** quantos botons de cada pin a conta já colocou, somando todos os murais (pessoais e compartilhados) */
  placed?: Record<string, number>;
};

export async function fetchInventory(sb: SupabaseClient): Promise<BadgeInventory | null> {
  const { data, error } = await sb.rpc("get_badge_inventory");
  if (error || !data) return null;
  return data as BadgeInventory;
}

export type BuyResult = { ok: true; credits: number } | { ok: false; reason: "no_credits" | "plus_required" | "error" };
async function buy(sb: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<BuyResult> {
  const { data, error } = await sb.rpc(fn, args);
  if (!error && data) return { ok: true, credits: (data as { credits: number }).credits };
  const m = error?.message ?? "";
  return { ok: false, reason: m.includes("no_credits") ? "no_credits" : m.includes("plus_required") ? "plus_required" : "error" };
}
export const buyBadge = (sb: SupabaseClient, key: number, mode: "unlock" | "unit") => buy(sb, "buy_badge", { p_key: key, p_mode: mode });
/** Compra `qty` unidades de um pin (se ainda não liberou, a 1ª é o pin e as demais são unidades extras). */
export const buyBadgeQty = (sb: SupabaseClient, key: number, qty: number) => buy(sb, "buy_badge_qty", { p_key: key, p_qty: qty });
export const buyBoard = (sb: SupabaseClient, id: string) => buy(sb, "buy_board", { p_board: id });
export const buyPinProduct = (sb: SupabaseClient, id: string) => buy(sb, "buy_pin_product", { p_id: id });
export const buyMuralSlot = (sb: SupabaseClient) => buy(sb, "buy_mural_slot", {});

/** Quantas unidades de um pin a pessoa ainda pode colocar (ninguém tem ilimitado). owned = false: ainda não liberou (loja). */
export type Stock = { owned: boolean; left: number | null; total: number | null };
export function stockFor(item: CatalogItem | undefined, placedOfKey: number): Stock {
  if (!item || !item.owned) return { owned: false, left: 0, total: 0 };
  const total = 1 + item.extra;
  return { owned: true, left: Math.max(0, total - placedOfKey), total };
}
