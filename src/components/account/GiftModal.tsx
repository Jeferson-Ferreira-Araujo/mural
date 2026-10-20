"use client";

import { badgeSrc } from "@/lib/badges";
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

const CONFETTI = ["#f2b81c", "#e0443a", "#2f78d6", "#3fa653", "#b58cff", "#ff8fb8"];

/** Chuva de confete (só enfeite, some sozinha). */
function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      {Array.from({ length: 22 }, (_, i) => (
        <span
          key={i}
          className="absolute -top-3 block h-3 w-1.5 rounded-[1px]"
          style={{ left: `${(i * 37) % 100}%`, background: CONFETTI[i % CONFETTI.length], transform: `rotate(${(i * 53) % 180}deg)`, animation: `confetti-fall ${3.2 + (i % 5) * 0.5}s linear ${(i % 7) * 0.25}s 1 both` }}
        />
      ))}
    </div>
  );
}

/** Avisa a pessoa que ganhou um presente: 1 mês de PINZ+ de alguém ou o presente de aniversário (ao vivo ou no próximo login). */
export function GiftModal({ gift, name, onClose }: { gift: GiftNote | null; /** nome de quem está entrando (aniversário) */ name?: string | null; onClose: () => void }) {
  const bday = gift?.birthday;
  const until = gift?.until ? new Date(gift.until).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }) : null;
  return (
    <Modal open={!!gift} onClose={onClose} title={bday ? "" : "Você ganhou um presente!"} label={bday ? "Feliz aniversário!" : undefined}>
      {gift && bday ? (
        <div className="relative space-y-4 text-center text-[#2f2218]">
          <Confetti />
          {/* enfeite: bottons de festa em volta do título */}
          <div className="relative mx-auto flex h-24 items-end justify-center gap-1" aria-hidden>
            {[87, 89, 88, 90, 114].map((k, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={k} src={badgeSrc(k)} alt="" draggable={false} className="max-h-full select-none drop-shadow-[0_3px_4px_rgba(0,0,0,.35)]" style={{ height: i === 2 ? "100%" : "72%", transform: `rotate(${(i - 2) * 7}deg)` }} />
            ))}
          </div>
          <div>
            <p className="font-title text-3xl leading-tight font-semibold">Feliz aniversário{name ? `, ${name}` : ""}! 🎉</p>
            <p className="mx-auto mt-2 max-w-[22rem] text-[15px] leading-snug text-[#4a3826]">O Pinz deseja a você um dia incrível e um ano cheio de recados, fotos e momentos especiais. Parabéns!</p>
          </div>
          <div className="rounded-2xl border border-[#e8d5a6] bg-[#fff6dd] p-4 text-left">
            <p className="text-xs font-bold tracking-wide text-[#8a6a2a] uppercase">O que você ganhou</p>
            {bday === "plus" ? (
              <ul className="mt-2 space-y-2 text-[15px]">
                <li className="flex gap-2">
                  <span aria-hidden>✨</span>
                  <span>
                    <strong>PINZ+ liberado{until ? ` até ${until}` : " até o fim do mês"}</strong>, de presente.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span aria-hidden>📌</span>
                  <span>Todos os tipos de pin (desenho, música, vídeo, voz e local) e a cápsula do tempo.</span>
                </li>
                <li className="flex gap-2">
                  <span aria-hidden>🔒</span>
                  <span>Segredo nos pins, mensagem de boas-vindas, mural compartilhado e pins e displays sem limite.</span>
                </li>
              </ul>
            ) : (
              <>
                <p className="mt-2 text-[15px]">
                  <strong>Todos os bottons de aniversário</strong>, de presente por ser PINZ+: balões, bolos, presentes, recados de parabéns e muito mais.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2" aria-hidden>
                  {[88, 87, 91, 92, 93, 107, 100, 113, 119, 122].map((k) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={k} src={badgeSrc(k)} alt="" draggable={false} className="h-10 w-auto select-none drop-shadow-[0_2px_3px_rgba(0,0,0,.3)]" />
                  ))}
                </div>
                <p className="mt-3 text-sm text-[#4a3826]">Eles estão no primeiro botão da sua barra de bottons (o que tem a setinha em cima). Toque nele, escolha e arraste para o mural.</p>
              </>
            )}
          </div>
          <button type="button" onClick={onClose} className={`${primaryButton} w-full`}>
            Aproveitar!
          </button>
        </div>
      ) : (
        gift && (
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
        )
      )}
    </Modal>
  );
}
