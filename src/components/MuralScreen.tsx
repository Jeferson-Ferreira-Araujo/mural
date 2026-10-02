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
  | { mode: "demo"; onSend: (p: SendPayload) => void; onTried: () => void; triedAlready: boolean };

type Props = Omit<ViewProps, "onCompose"> & { composer: ComposerMode };

/**
 * Desktop (lg+): mural físico de 28 espaços. Mobile/tablet: carrossel, uma mensagem por vez.
 * As duas versões são renderizadas e alternadas por CSS (sem flash de layout no carregamento).
 */
export function MuralScreen({ composer, ...view }: Props) {
  const [open, setOpen] = useState(false);
  const { onNotify } = view;

  const onCompose =
    composer.mode === "hidden"
      ? null
      : composer.mode === "soon"
        ? () => onNotify("Em breve: o envio de mensagens chega na próxima etapa.")
        : () => setOpen(true);

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
          used={view.items.length}
          triedAlready={composer.triedAlready}
          onTried={composer.onTried}
          onSend={(p) => {
            composer.onSend(p);
            setOpen(false);
            onNotify(p.capsuleAt ? "Cápsula fechada e colada no mural! 🔒" : "Seu PINZ foi colado no mural! 📌");
          }}
        />
      )}
    </>
  );
}
