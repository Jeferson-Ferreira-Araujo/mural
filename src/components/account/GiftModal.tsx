"use client";

import { Avatar } from "../Avatar";
import { primaryButton } from "../ui";
import { Modal } from "./Modal";

export type GiftNote = { id: string; actor?: string; avatar?: string | null; /** aniversário: "plus" (conta FREE ganhou o PINZ+ no mês) ou "badges" (PINZ+ ganhou bottons) */ birthday?: "plus" | "badges"; until?: string };

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

/** Avisa a pessoa que ganhou um presente: 1 mês de PINZ+ de alguém ou o presente de aniversário (ao vivo ou no próximo login). */
export function GiftModal({ gift, onClose }: { gift: GiftNote | null; onClose: () => void }) {
  const bday = gift?.birthday;
  const until = gift?.until ? new Date(gift.until).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }) : null;
  return (
    <Modal open={!!gift} onClose={onClose} title={bday ? "Feliz aniversário!" : "Você ganhou um presente!"}>
      {gift && (
        <div className="space-y-4 text-center text-[#2f2218]">
          <div className="text-5xl" aria-hidden>
            {bday ? "🎂" : "🎁"}
          </div>
          {bday === "plus" ? (
            <>
              <p className="text-base font-semibold">No mês do seu aniversário o Pinz te dá o PINZ+ de presente!</p>
              <p className="text-sm text-[#4a3826]">Todos os benefícios estão liberados{until ? ` até ${until}` : " até o fim do mês"}. Aproveite!</p>
            </>
          ) : bday === "badges" ? (
            <>
              <p className="text-base font-semibold">Parabéns! Você ganhou bottons de aniversário 🎈</p>
              <p className="text-sm text-[#4a3826]">Eles já estão na sua barra de bottons. Use no seu mural!</p>
            </>
          ) : (
            <>
              {gift.actor && <Avatar src={gift.avatar ?? null} name={gift.actor} className="mx-auto size-16" />}
              <p className="text-base font-semibold">{gift.actor ? `@${gift.actor}` : "Alguém"} te presenteou com 1 mês de PINZ+!</p>
              <p className="text-sm text-[#4a3826]">Seu PINZ+ já está ativo. Aproveite todos os benefícios.</p>
            </>
          )}
          <button type="button" onClick={onClose} className={`${primaryButton} w-full`}>
            Obrigado!
          </button>
        </div>
      )}
    </Modal>
  );
}
