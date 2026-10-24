"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "./SiteTracker";
import type { PinPlace } from "./composer/types";
import { BOARD_CAPACITY } from "@/lib/plans";
import { inBoardOrder, takenSlots } from "@/lib/slots";
import { Modal } from "./account/Modal";
import { ComposerDialog } from "./composer/ComposerDialog";
import { useBadges } from "./badges/BadgeContext";
import type { SendPayload } from "./composer/types";
import { DesktopBoard } from "./DesktopBoard";
import { MobileCarousel } from "./MobileCarousel";
import type { ViewProps } from "./viewProps";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

/** Como o botão "Deixar uma mensagem" se comporta. */
export type ComposerMode =
  /** escondido (ex.: visão do dono) */
  | { mode: "hidden" }
  /** ainda não existe envio real: avisa "em breve" */
  | { mode: "soon" }
  /** demonstração: abre o compositor e cola a mensagem só no estado local */
  | { mode: "demo"; /** aviso depois de colar (padrão: "Seu PINZ foi colocado no mural!") */ sentNote?: string; /** devolve um texto de erro se não conseguiu colar (a janela fica aberta) */ onSend: (p: SendPayload) => void | Promise<string | void>; onTried: () => void; triedAlready: boolean; /** antes de abrir o compositor: devolve o aviso se ainda não pode deixar um novo pin */ canOpen?: () => Promise<string | null>; /** nickname de quem está logado: o pin sai sempre assinado com ele */ signAs?: string | null; /** sem conta: não dá para publicar; a pessoa é avisada e este endereço leva à criação da conta (que volta para este mural) */ signupHref?: string; /** sem conta: endereço do login de quem já tem conta */ loginHref?: string };

type Props = Omit<ViewProps, "onCompose"> & { composer: ComposerMode };

/**
 * Desktop (lg+): mural físico de 28 espaços. Mobile/tablet: carrossel, uma mensagem por vez.
 * As duas versões são renderizadas e alternadas por CSS (sem flash de layout no carregamento).
 */
export function MuralScreen({ composer, ...view }: Props) {
  const tl = useLit();
  const tx = useTranslations("components.MuralScreen");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) trackEvent("open_composer");
  }, [open]);
  // espaço em que o pin vai ser colado (desktop: o visitante clica no espaço do mural; sem isso, ele escolhe no compositor)
  const [slot, setSlot] = useState<number | null>(null);
  const { badges, displays, canDisplays, placeDisplayDataAtSlot, openStore } = useBadges();
  // espaços cobertos por pins da loja não recebem pins
  const coveredSlots = [...badges.flatMap((b) => (b.kind === "display" ? (b.slots ?? []) : [])), ...view.items.flatMap((it) => ("fcov" in it && it.fcov ? it.fcov : []))];
  const [place, setPlace] = useState<PinPlace | null>(null); // mural livre: ponto escolhido ao clicar
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [needAccount, setNeedAccount] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const { onNotify } = view;

  const onCompose =
    composer.mode === "hidden"
      ? null
      : composer.mode === "soon"
        ? () => onNotify(tx("m_emBreveOEnvioDe"))
        : async (s?: number, pl?: PinPlace) => {
            // visitante sem conta: antes de começar, avisa que publicar exige conta
            if (composer.mode === "demo" && !composer.signAs && composer.signupHref) {
              setNeedAccount(true);
              return;
            }
            const why = composer.canOpen ? await composer.canOpen() : null;
            if (why) {
              setBlocked(why);
              return;
            }
            setSlot(typeof s === "number" ? s : null);
            setPlace(pl ?? null);
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
          onClose={() => (setOpen(false), setSendError(null))}
          plan={view.plan}
          capacity={capacity}
          taken={[...takenSlots(view.items, capacity), ...coveredSlots]}
          fixedSlot={slot}
          displays={canDisplays ? { ids: displays, onPlace: (d) => (setOpen(false), slot !== null && placeDisplayDataAtSlot(d, slot)), onStore: () => (setOpen(false), openStore()) } : null}
          used={view.items.length}
          triedAlready={composer.triedAlready}
          signAs={composer.signAs}
          onTried={composer.onTried}
          sending={sending}
          error={sendError}
          onSend={async (p) => {
            if (sending) return;
            setSending(true);
            setSendError(null);
            try {
              const err = await composer.onSend(place ? { ...p, place } : p);
              if (err) {
                setSendError(err); // dentro da janela: o aviso da página fica atrás dela
                return;
              }
              setOpen(false);
              window.dispatchEvent(new CustomEvent("pinz:expect-new")); // o quadro destaca onde o pin entrou
              onNotify((composer.sentNote ? tl(composer.sentNote) : undefined) ?? (p.capsuleAt ? tx("m_capsulaFechadaEColocadaNo") : tx("m_seuPinzFoiColocadoNo")));
            } finally {
              setSending(false);
            }
          }}
        />
      )}
      <Modal open={!!blocked} onClose={() => setBlocked(null)} title={tx("aguardeUmPouco")}>
        <p className="text-[15px] leading-relaxed">{blocked}</p>
        <button type="button" onClick={() => setBlocked(null)} className="mt-5 w-full cursor-pointer rounded-xl bg-[#1f232b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2c313b]">
          {tx("entendi")}</button>
      </Modal>
      <Modal open={needAccount} onClose={() => setNeedAccount(false)} title={tx("crieUmaContaParaPublicar")}>
        <p className="text-[15px] leading-relaxed">{tx("paraDeixarUmPinNeste")}</p>
        {composer.mode === "demo" && (
          <div className="mt-5 flex flex-col gap-2">
            <a href={composer.signupHref} className="block rounded-xl bg-[#d9a21b] px-4 py-3 text-center font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a1c12]">
              {tx("criarMinhaConta")}</a>
            {composer.loginHref && (
              <a href={composer.loginHref} className="block rounded-xl border border-[#d9c9ad] bg-white/60 px-4 py-3 text-center text-sm font-semibold text-[#4a3826] transition hover:bg-white">
                {tx("jaTenhoConta")}</a>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
