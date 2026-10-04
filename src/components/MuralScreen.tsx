"use client";

import { useState } from "react";
import { BOARD_CAPACITY } from "@/lib/plans";
import { inBoardOrder, takenSlots } from "@/lib/slots";
import { ComposerDialog } from "./composer/ComposerDialog";
import type { SendPayload } from "./composer/types";
import { DesktopBoard } from "./DesktopBoard";
import { MobileCarousel } from "./MobileCarousel";
import type { ViewProps } from "./viewProps";

/** Como o botão "Deixar uma mensagem anônima" se comporta. */
export type ComposerMode =
  /** escondido (ex.: visão do dono) */
  | { mode: "hidden" }
  /** ainda não existe envio real: avisa "em breve" */
  | { mode: "soon" }
  /** demonstração: abre o compositor e cola a mensagem só no estado local */
  | { mode: "demo"; /** aviso depois de colar (padrão: "Seu PINZ foi colado no mural!") */ sentNote?: string; /** devolve um texto de erro se não conseguiu colar (a janela fica aberta) */ onSend: (p: SendPayload) => void | Promise<string | void>; onTried: () => void; triedAlready: boolean; /** nickname de quem está logado (opção de assinar o pin) */ signAs?: string | null; /** sem conta: endereço do login para quem quiser assinar o pin */ loginHref?: string };

type Props = Omit<ViewProps, "onCompose"> & { composer: ComposerMode };

/**
 * Desktop (lg+): mural físico de 28 espaços. Mobile/tablet: carrossel, uma mensagem por vez.
 * As duas versões são renderizadas e alternadas por CSS (sem flash de layout no carregamento).
 */
export function MuralScreen({ composer, ...view }: Props) {
  const [open, setOpen] = useState(false);
  // espaço em que o pin vai ser colado (desktop: o visitante clica no espaço do mural; sem isso, ele escolhe no compositor)
  const [slot, setSlot] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const { onNotify } = view;

  const onCompose =
    composer.mode === "hidden"
      ? null
      : composer.mode === "soon"
        ? () => onNotify("Em breve: o envio de mensagens chega na próxima etapa.")
        : (s?: number) => {
            setSlot(typeof s === "number" ? s : null);
            setOpen(true);
          };

  const capacity = view.capacity ?? BOARD_CAPACITY;
  const props: ViewProps = { ...view, capacity, onCompose };

  return (
    <>
      <div className="hidden lg:block">
        <DesktopBoard {...props} />
      </div>
      <div className="lg:hidden">
        <MobileCarousel {...props} items={inBoardOrder(view.items, capacity)} />
      </div>

      {composer.mode === "demo" && (
        <ComposerDialog
          open={open}
          onClose={() => setOpen(false)}
          plan={view.plan}
          capacity={capacity}
          taken={takenSlots(view.items, capacity)}
          fixedSlot={slot}
          used={view.items.length}
          triedAlready={composer.triedAlready}
          signAs={composer.signAs}
          loginHref={composer.loginHref}
          onTried={composer.onTried}
          sending={sending}
          onSend={async (p) => {
            if (sending) return;
            setSending(true);
            try {
              const err = await composer.onSend(p);
              if (err) {
                onNotify(err);
                return;
              }
              setOpen(false);
              onNotify(composer.sentNote ?? (p.capsuleAt ? "Cápsula fechada e colada no mural! 🔒" : "Seu PINZ foi colado no mural! 📌"));
            } finally {
              setSending(false);
            }
          }}
        />
      )}
    </>
  );
}
