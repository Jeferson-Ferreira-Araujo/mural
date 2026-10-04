import type { SupabaseClient } from "@supabase/supabase-js";
import type { MuralRef } from "./mural";
import type { MessageType } from "./types";

/** Pins decorativos (botons) que o dono coloca no próprio mural. Imagens em /public/img/badges (b01.webp...), recortadas da grade enviada. */
export type BadgeDef = { key: number; /** largura / altura da imagem */ ratio: number; /** nome na loja (só os da loja têm) */ name?: string };

export const BADGES: readonly BadgeDef[] = [
  { key: 1, ratio: 1.021 },
  { key: 2, ratio: 1.126 },
  { key: 3, ratio: 1.126 },
  { key: 4, ratio: 1.044 },
  { key: 5, ratio: 1.026 },
  { key: 6, ratio: 1.31 },
  { key: 7, ratio: 1.333 },
  { key: 8, ratio: 1.477 },
  { key: 9, ratio: 0.917 },
  { key: 10, ratio: 1.01 },
  { key: 11, ratio: 1.01 },
  { key: 12, ratio: 0.934 },
  { key: 13, ratio: 1.025 },
  { key: 14, ratio: 1.047 },
  { key: 15, ratio: 1.097 },
  { key: 16, ratio: 1.021 },
  { key: 17, ratio: 1.048 },
  { key: 18, ratio: 1.021 },
  { key: 19, ratio: 1.054 },
  { key: 20, ratio: 1.03 },
  { key: 21, ratio: 1.35 },
  { key: 22, ratio: 0.793 },
  { key: 23, ratio: 1.015 },
  { key: 24, ratio: 1.005 },
  { key: 25, ratio: 0.906 },
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
/** Pins decorativos do plano gratuito (1 unidade de cada). O PLUS libera os 25 iniciais; os outros se compram. */
export const FREE_BADGES: readonly number[] = [1, 2, 4, 5, 9, 12, 13, 17, 22, 25];
export const MAX_BADGES = 200; // teto técnico (o PLUS é "quantos quiser")

/** Pinz "físicos" (aparelhos e cápsulas): não aceitam botom por cima. Os de papel (post-it, texto, lista, foto) aceitam. */
export const PHYSICAL_TYPES: readonly (MessageType | "capsule")[] = ["music", "video", "voice", "place", "capsule"];

export type PlacedBadge = { id: string; key: number; /** centro, em % da área útil do quadro */ x: number; y: number };

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

export async function moveBadge(sb: SupabaseClient, id: string, x: number, y: number): Promise<boolean> {
  const { error } = await sb.rpc("move_badge", { p_id: id, p_x: x, p_y: y });
  return !error;
}

export async function removeBadge(sb: SupabaseClient, id: string): Promise<boolean> {
  const { error } = await sb.rpc("remove_badge", { p_id: id });
  return !error;
}

// ---------- estoque e loja ----------

/** Um pin do catálogo, do ponto de vista de quem está logado. */
export type CatalogItem = { key: number; /** todo mundo tem (1 unidade no FREE) */ starter: boolean; /** preço, em créditos, para liberar (pins da loja) */ price: number; /** preço de +1 unidade (FREE) */ unitPrice: number; owned: boolean; /** unidades extras compradas */ extra: number };
export type BoardOffer = { id: string; price: number; owned: boolean };
export type BadgeInventory = {
  credits: number;
  /** a conta tem o plano PLUS (só ele compra na loja) */
  plus: boolean;
  extraMurals: number;
  muralCount: number;
  /** preço de um mural extra, em créditos */
  muralPrice: number;
  boards: BoardOffer[];
  catalog: CatalogItem[];
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
export const buyBoard = (sb: SupabaseClient, id: string) => buy(sb, "buy_board", { p_board: id });
export const buyMuralSlot = (sb: SupabaseClient) => buy(sb, "buy_mural_slot", {});

/** Quantas unidades de um pin a pessoa ainda pode colocar. left = null: ilimitado (PLUS). owned = false: ainda não liberou (loja). */
export type Stock = { owned: boolean; left: number | null; total: number | null };
export function stockFor(item: CatalogItem | undefined, plan: "free" | "full", placedOfKey: number): Stock {
  if (!item || !item.owned) return { owned: false, left: 0, total: 0 };
  if (plan === "full") return { owned: true, left: null, total: null };
  const total = 1 + item.extra;
  return { owned: true, left: Math.max(0, total - placedOfKey), total };
}
