"use client";

import { Avatar } from "../Avatar";
import { primaryButton } from "../ui";
import { Modal } from "./Modal";

export type GiftNote = { id: string; actor?: string; avatar?: string | null };

const KEY = "pinz:gift-seen";
const seenIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as string[];
  } catch {
    return [];
  }
};
export const giftSeen = (id: string) => seenIds().includes(id);
export function markGiftSeen(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify([id, ...seenIds()].slice(0, 20)));
  } catch {
    /* sem armazenamento: o aviso pode aparecer de novo */
  }
}

/** Avisa a pessoa que ganhou um mês de PINZ+ de presente (ao vivo ou no próximo login). */
export function GiftModal({ gift, onClose }: { gift: GiftNote | null; onClose: () => void }) {
  return (
    <Modal open={!!gift} onClose={onClose} title="Você ganhou um presente!">
      {gift && (
        <div className="space-y-4 text-center text-[#2f2218]">
          <div className="text-5xl" aria-hidden>
            🎁
          </div>
          {gift.actor && <Avatar src={gift.avatar ?? null} name={gift.actor} className="mx-auto size-16" />}
          <p className="text-base font-semibold">{gift.actor ? `@${gift.actor}` : "Alguém"} te presenteou com 1 mês de PINZ+!</p>
          <p className="text-sm text-[#4a3826]">Seu PINZ+ já está ativo. Aproveite todos os benefícios.</p>
          <button type="button" onClick={onClose} className={`${primaryButton} w-full`}>
            Obrigado!
          </button>
        </div>
      )}
    </Modal>
  );
}
