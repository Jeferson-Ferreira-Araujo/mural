"use client";

import { notificationText, type Notification } from "@/lib/notifications";
import { Avatar } from "../Avatar";
import { Modal } from "./Modal";

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Sino: avisos da conta, em tempo real: pin novo no seu mural, pin aprovado, novo seguidor, reações e listas marcadas. */
export function NotificationsModal({ open, onClose, items }: { open: boolean; onClose: () => void; items: Notification[] | null }) {
  return (
    <Modal open={open} onClose={onClose} title="Notificações">
      {!items ? (
        <p className="py-6 text-center text-sm text-[#6b5440]">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#6b5440]">Nenhuma notificação por enquanto.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((n) => (
            <li key={n.id} className={`rounded-2xl border p-3.5 ${n.read ? "border-[#e1d3ba] bg-white/60" : "border-[#e0b04a] bg-[#fff6dd]"}`}>
              <div className="flex items-start gap-3">
                {"actor" in n.data && n.data.actor && <Avatar src={"avatar" in n.data ? n.data.avatar : null} name={n.data.actor} className="size-10 shrink-0" />}
                <p className="min-w-0 flex-1 text-[15px] leading-snug">{notificationText(n)}</p>
              </div>
              <p className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#8a7b69]">
                <span>{when(n.createdAt)}</span>
                {n.kind !== "reward" && n.kind !== "gift" && n.kind !== "birthday" && (
                  <a href={n.kind === "follow" ? `/${n.data.actor}` : `/${n.data.muralNick}/${n.data.muralSlug}`} className="font-semibold text-[#4a3826] underline">
                    {n.kind === "follow" ? "Ver o perfil" : "Ver o mural"}
                  </a>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
