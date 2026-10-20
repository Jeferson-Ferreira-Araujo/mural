import type { SupabaseClient } from "@supabase/supabase-js";
import { reactionEmoji } from "./reactions";

export type ListCheckedData = { avatar?: string | null; actor: string; muralNick: string; muralSlug: string; muralTitle: string; listTitle: string; items: { text: string; done: boolean }[] };
export type ReactionData = { avatar?: string | null; actor: string; emoji: string; muralNick: string; muralSlug: string; muralTitle?: string; messageId: string };
export type PinNewData = { avatar?: string | null; actor: string; muralNick: string; muralSlug: string; muralTitle?: string; messageId: string; pending?: boolean };
export type PinApprovedData = { avatar?: string | null; actor: string; muralNick: string; muralSlug: string; muralTitle?: string; messageId: string };
export type Notification =
  | { id: string; kind: "list_checked"; data: ListCheckedData; read: boolean; createdAt: string }
  | { id: string; kind: "reaction"; data: ReactionData; read: boolean; createdAt: string }
  | { id: string; kind: "pin_new"; data: PinNewData; read: boolean; createdAt: string }
  | { id: string; kind: "pin_approved"; data: PinApprovedData; read: boolean; createdAt: string }
  | { id: string; kind: "follow"; data: { actor: string; avatar?: string | null }; read: boolean; createdAt: string }
  | { id: string; kind: "gift"; data: { actor?: string; avatar?: string | null; days?: number }; read: boolean; createdAt: string }
  | { id: string; kind: "birthday"; data: { gift?: "plus" | "badges"; until?: string }; read: boolean; createdAt: string }
  | { id: string; kind: "archived"; data: { count: number; muralSlug: string; muralNick: string; muralTitle?: string }; read: boolean; createdAt: string }
  | { id: string; kind: "reward"; data: { task: string; credits: number; title: string; actor?: string; avatar?: string | null }; read: boolean; createdAt: string };

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
export type NotifT = (key: string, values?: Record<string, string | number>) => string;

export function notificationText(n: Notification, t: NotifT): string {
  if (n.kind === "pin_new") return t("pinNew", { actor: n.data.actor, mural: n.data.muralTitle ?? n.data.muralNick, pending: n.data.pending ? "yes" : "no" });
  if (n.kind === "pin_approved") return t("pinApproved", { actor: n.data.actor });
  if (n.kind === "gift") return t("gift", { hasActor: n.data.actor ? "yes" : "no", actor: n.data.actor ?? "" });
  if (n.kind === "birthday") return n.data.gift === "plus" ? t("birthdayPlus") : t("birthdayBadges");
  if (n.kind === "archived") return t("archived", { count: n.data.count, mural: n.data.muralTitle ?? n.data.muralSlug });
  if (n.kind === "reward") return t("reward", { credits: n.data.credits, hasActor: n.data.actor ? "yes" : "no", actor: n.data.actor ?? "" });
  if (n.kind === "follow") return t("follow", { actor: n.data.actor });
  if (n.kind === "reaction") return t("reaction", { actor: n.data.actor, emoji: reactionEmoji(n.data.emoji), nick: n.data.muralNick });
  const d = n.data;
  const parts = d.items.map((i) => t(i.done ? "listDone" : "listUndone", { text: i.text }));
  const what = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} ${t("listAnd")} ${parts[parts.length - 1]}` : (parts[0] ?? t("listNone"));
  return t("list", { actor: d.actor, what, list: d.listTitle });
}
