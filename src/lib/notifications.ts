import type { SupabaseClient } from "@supabase/supabase-js";

export type ListCheckedData = { actor: string; muralNick: string; muralSlug: string; muralTitle: string; listTitle: string; items: { text: string; done: boolean }[] };
export type Notification = { id: string; kind: "list_checked"; data: ListCheckedData; read: boolean; createdAt: string };

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

/** "@fulano marcou “Malas” e desmarcou “Passagens” na lista “Viagem”" */
export function notificationText(n: Notification): string {
  const d = n.data;
  const parts = d.items.map((i) => `${i.done ? "marcou" : "desmarcou"} “${i.text}”`);
  const what = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}` : (parts[0] ?? "mexeu");
  return `@${d.actor} ${what} na sua lista “${d.listTitle}”`;
}
