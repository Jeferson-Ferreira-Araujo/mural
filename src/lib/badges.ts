import type { SupabaseClient } from "@supabase/supabase-js";
import type { MuralRef } from "./mural";
import type { MessageType } from "./types";

/** Pins decorativos (botons) que o dono coloca no próprio mural. Imagens em /public/img/badges (b01.webp...), recortadas da grade enviada. */
export type BadgeDef = { key: number; /** largura / altura da imagem */ ratio: number };

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
];

export const badgeDef = (key: number) => BADGES.find((b) => b.key === key);
export const badgeSrc = (key: number) => `/img/badges/b${String(key).padStart(2, "0")}.webp`;

/** Largura de um botom no mural, em em (1em ≈ 1% da largura do quadro). */
export const BADGE_EM = 4.3;
export const MAX_BADGES = 40;

/** Pinz "físicos" (aparelhos e cápsulas): não aceitam botom por cima. Os de papel (post-it, texto, lista, foto) aceitam. */
export const PHYSICAL_TYPES: readonly (MessageType | "capsule")[] = ["music", "video", "voice", "place", "capsule"];

export type PlacedBadge = { id: string; key: number; /** centro, em % da área útil do quadro */ x: number; y: number };

/** Botons do mural (null = sem acesso). */
export async function fetchBadges(sb: SupabaseClient, ref: MuralRef, token: string | null): Promise<PlacedBadge[] | null> {
  const { data, error } = await sb.rpc("get_badges", { p_nick: ref.nick, p_slug: ref.slug, p_token: token });
  if (error || !Array.isArray(data)) return null;
  return (data as PlacedBadge[]).map((b) => ({ ...b, x: Number(b.x), y: Number(b.y) }));
}

export async function addBadge(sb: SupabaseClient, muralId: string, key: number, x: number, y: number): Promise<string | null> {
  const { data, error } = await sb.rpc("add_badge", { p_mural_id: muralId, p_key: key, p_x: x, p_y: y });
  return error ? null : ((data as { id: string }).id ?? null);
}

export async function moveBadge(sb: SupabaseClient, id: string, x: number, y: number): Promise<boolean> {
  const { error } = await sb.rpc("move_badge", { p_id: id, p_x: x, p_y: y });
  return !error;
}

export async function removeBadge(sb: SupabaseClient, id: string): Promise<boolean> {
  const { error } = await sb.rpc("remove_badge", { p_id: id });
  return !error;
}
