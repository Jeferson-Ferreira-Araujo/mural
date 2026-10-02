import type { CSSProperties } from "react";
import type { Message } from "@/lib/types";
import { BoardHeader } from "./BoardHeader";
import { MessageView } from "./messages/MessageView";
import { UnlockPanel } from "./UnlockPanel";

/** Imagem da lousa (desktop). Original em /imagens/quadro-desktop.png; versão otimizada servida daqui. */
export const BOARD_IMAGE = "/img/quadro-desktop.webp";

/** Área útil de cortiça dentro da imagem (em % da imagem 3:2). */
const CORK = { left: 11.2, top: 8, width: 79.4, height: 76.2 };

type Props = {
  messages: Message[];
  owner: string;
  tagline: string;
  question: string;
  unlocked: boolean;
  onUnlock: () => void;
};

/**
 * Mural físico completo. O container usa `container-type: inline-size`
 * e todos os tamanhos derivam de `cqw`, então o mural escala por inteiro.
 */
export function DesktopBoard({ messages, owner, tagline, question, unlocked, onUnlock }: Props) {
  return (
    <div className="relative grid h-dvh w-full place-items-center overflow-hidden bg-[#3b2616]">
      {/* parede/ambiente: a mesma foto desfocada preenche as laterais */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BOARD_IMAGE} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-80 blur-2xl" />

      <main
        className="relative aspect-[3/2] [container-type:inline-size]"
        style={{ width: "min(100vw, 150dvh)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BOARD_IMAGE} alt="Mural de cortiça com moldura de madeira" className="absolute inset-0 size-full select-none" draggable={false} />

        <div
          className="absolute"
          style={{
            left: `${CORK.left}%`,
            top: `${CORK.top}%`,
            width: `${CORK.width}%`,
            height: `${CORK.height}%`,
            fontSize: "max(10px, 1.02cqw)",
          }}
        >
          <div className="absolute z-[8] w-[22em]" style={{ left: "2%", top: "3.5%" }}>
            <BoardHeader owner={owner} tagline={tagline} />
          </div>

          {messages.map((m, i) => (
            <div
              key={m.id}
              className="pinned absolute"
              style={
                {
                  left: `${m.pos.x}%`,
                  top: `${m.pos.y}%`,
                  zIndex: m.pos.z,
                  "--rot": `${m.pos.rot}deg`,
                  animationDelay: `${0.1 + i * 0.08}s`,
                } as CSSProperties
              }
            >
              <MessageView message={m} />
            </div>
          ))}

          <div className="absolute z-[9] w-[22em]" style={{ right: "2%", bottom: "3%" }}>
            <UnlockPanel question={question} unlocked={unlocked} onUnlock={onUnlock} />
          </div>
        </div>
      </main>
    </div>
  );
}
