import type { SupabaseClient } from "@supabase/supabase-js";
import { reactionEmoji } from "./reactions";

export type ListCheckedData = { actor: string; muralNick: string; muralSlug: string; muralTitle: string; listTitle: string; items: { text: string; done: boolean }[] };
export type ReactionData = { actor: string; emoji: string; muralNick: string; muralSlug: string; muralTitle?: string; messageId: string };
export type PinNewData = { actor: string; muralNick: string; muralSlug: string; muralTitle?: string; messageId: string; pending?: boolean };
export type PinApprovedData = { actor: string; muralNick: string; muralSlug: string; muralTitle?: string; messageId: string };
export type Notification =
  | { id: string; kind: "list_checked"; data: ListCheckedData; read: boolean; createdAt: string }
  | { id: string; kind: "reaction"; data: ReactionData; read: boolean; createdAt: string }
  | { id: string; kind: "pin_new"; data: PinNewData; read: boolean; createdAt: string }
  | { id: string; kind: "pin_approved"; data: PinApprovedData; read: boolean; createdAt: string }
  | { id: string; kind: "follow"; data: { actor: string }; read: boolean; createdAt: string };

export async function fetchNotifications(sb: SupabaseClient): Promise<Notification[]> {
  const { data, error } = await sb.rpc("list_notifications", { p_limit: 30 });
  return error || !Array.isArray(data) ? [] : (data as Notification[]);
}

export async function unreadCount(sb: SupabaseClient): Promise<number> {
  const { data, error } = await sb.rpc("unread_notifications_count");
  return error ? 0 : Number(data) || 0;
}

export async function markAllRead(sb: SupabaseClient): Promise<void> {
  await sb.rpc("mark_notifications_read");
}

/** "@fulano marcou “Malas” e desmarcou “Passagens” na lista “Viagem”" / "@fulano reagiu ❤️ ao seu pin no mural de @beltrano" */
export function notificationText(n: Notification): string {
  if (n.kind === "pin_new") return `@${n.data.actor} deixou um PINZ no mural “${n.data.muralTitle ?? n.data.muralNick}”${n.data.pending ? " · aguardando a sua aprovação" : ""}`;
  if (n.kind === "pin_approved") return `@${n.data.actor} aprovou o seu PINZ no mural dele`;
  if (n.kind === "follow") return `@${n.data.actor} começou a seguir você`;
  if (n.kind === "reaction") return `@${n.data.actor} reagiu ${reactionEmoji(n.data.emoji)} ao seu pin no mural de @${n.data.muralNick}`;
  const d = n.data;
  const parts = d.items.map((i) => `${i.done ? "marcou" : "desmarcou"} “${i.text}”`);
  const what = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}` : (parts[0] ?? "mexeu");
  return `@${d.actor} ${what} na sua lista “${d.listTitle}”`;
}
