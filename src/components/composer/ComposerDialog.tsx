"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BOARD_CAPACITY, canUseCapsule, formatsFor, slotsFor, type PlanId } from "@/lib/plans";
import { formatInfo, type Message, type MessageType } from "@/lib/types";
import { MessageView } from "../messages/MessageView";
import { ghostButton, primaryButton } from "../ui";
import { CapsuleOption, capsuleDateOk, type CapsuleValue } from "./CapsuleOption";
import { FormatPicker } from "./FormatPicker";
import { FullNotice } from "./FullNotice";
import { SlotPicker } from "./SlotPicker";
import { ListForm, MusicForm, PhotoForm, PlaceForm, PostItForm, TextForm, VideoForm, VoiceForm } from "./forms";
import type { DraftMessage, SendPayload } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  plan: PlanId;
  capacity?: number;
  /** Espaços do quadro que já têm pin. */
  taken: number[];
  /** Espaço já escolhido no mural (desktop). Sem isso, o visitante escolhe aqui. */
  fixedSlot?: number | null;
  /** Quantas mensagens o mural já tem. */
  used: number;
  onSend: (payload: SendPayload) => void | Promise<void>;
  sending?: boolean;
  onTried: () => void;
  triedAlready: boolean;
  /** Mural em tela cheia do celular: o compositor abre DENTRO dele (girado junto, com o quadro ao fundo), em duas colunas. */
  portalTarget?: HTMLElement | null;
};

function FormFor({ format, onChange }: { format: MessageType; onChange: (d: DraftMessage | null) => void }) {
  switch (format) {
    case "postit":
      return <PostItForm onChange={onChange} />;
    case "text":
      return <TextForm onChange={onChange} />;
    case "list":
      return <ListForm onChange={onChange} />;
    case "photo":
      return <PhotoForm onChange={onChange} />;
    case "music":
      return <MusicForm onChange={onChange} />;
    case "video":
      return <VideoForm onChange={onChange} />;
    case "voice":
      return <VoiceForm onChange={onChange} />;
    case "place":
      return <PlaceForm onChange={onChange} />;
  }
}

/**
 * Compositor do visitante (quem visita NUNCA paga nem se cadastra).
 * 1) mural lotado → só "Eu tentei deixar um PINZ", sem composição;
 * 2) senão: escolhe um dos formatos liberados NESTE mural → escreve → (FULL) opcionalmente Cápsula → cola no mural.
 */
function Body({ plan, capacity = BOARD_CAPACITY, taken, fixedSlot = null, sending = false, used, onSend, onTried, triedAlready, onClose, landscape = false }: Omit<Props, "open" | "portalTarget"> & { landscape?: boolean }) {
  const available = slotsFor(plan, capacity);
  // onde colar: começa no primeiro espaço livre, mas o visitante escolhe qualquer um
  // o plano limita QUANTOS pins o mural tem (FREE: 15 de 28), não quais espaços: qualquer espaço livre serve
  const firstFree = Array.from({ length: capacity }, (_, i) => i).find((i) => !taken.includes(i)) ?? null;
  const planLimit = used >= available && firstFree !== null;
  const full = firstFree === null || used >= available;
  const formats = formatsFor(plan);
  const [format, setFormat] = useState<MessageType | null>(null);
  const [draft, setDraft] = useState<DraftMessage | null>(null);
  const [capsule, setCapsule] = useState<CapsuleValue>({ enabled: false, at: "" });
  const [picked, setPicked] = useState<number | null>(null);
  const choice = fixedSlot ?? picked;
  const slot = choice !== null && choice < capacity && !taken.includes(choice) ? choice : firstFree;

  const onDraft = useCallback((d: DraftMessage | null) => setDraft(d), []);

  if (full) return <FullNotice used={used} available={available} planLimit={planLimit} onTried={onTried} triedAlready={triedAlready} onClose={onClose} />;

  if (!format) return <FormatPicker formats={formats} onPick={setFormat} landscape={landscape} />;

  const canSend = !sending && !!draft && slot !== null && capsuleDateOk(capsule) && (!capsule.enabled || !!capsule.at);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft || !canSend || slot === null) return;
        onSend({ message: draft, slot, capsuleAt: capsule.enabled ? new Date(capsule.at).toISOString() : undefined });
      }}
      className={landscape ? "grid grid-cols-2 items-start gap-4" : "space-y-5"}
    >
      <div className="space-y-5">
      <div>
        <button type="button" onClick={() => { setFormat(null); setDraft(null); }} className="cursor-pointer text-sm font-semibold text-[#6b5440] underline">
          ← Trocar formato
        </button>
        <h3 className="font-title mt-1 text-xl font-semibold">{formatInfo[format].label}</h3>
      </div>

      {plan === "free" && (
        <p className="rounded-xl border border-[#d9c9ad] bg-[#e9d8b6]/50 px-3 py-2 text-xs text-[#6b5440]">
          Este mural tem <strong>{used}</strong> de <strong>{available}</strong> pins do plano gratuito{available - used <= 3 ? ` — ${available - used === 1 ? "resta só 1" : `restam ${available - used}`}` : ""}.
        </p>
      )}

      <FormFor format={format} onChange={onDraft} />

      {canUseCapsule(plan) && <CapsuleOption value={capsule} onChange={setCapsule} />}

      {(fixedSlot === null || fixedSlot === undefined) && <SlotPicker capacity={capacity} available={capacity} taken={taken} value={slot} onChange={setPicked} />}
      </div>

      <div className="space-y-5">
      {draft && (
        <section aria-label="Prévia" className={`rounded-2xl border border-dashed border-[#d9c9ad] bg-[#e9d8b6]/50 px-3 ${landscape ? "py-3" : "py-6"}`}>
          <p className="mb-4 text-center text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">Prévia no mural</p>
          <div className="flex justify-center">
            <div className={landscape ? "text-[10px]" : "text-[15px]"}>
              {capsule.enabled ? (
                <p className="mb-3 max-w-[14em] text-center text-sm text-[#6b5440]">🔒 No mural ela aparece como uma cápsula fechada até a data escolhida. O conteúdo só aparece aqui na prévia.</p>
              ) : null}
              <MessageView message={{ ...draft, id: "preview" } as Message} />
            </div>
          </div>
        </section>
      )}

      <button type="submit" disabled={!canSend} className={primaryButton}>
        {sending ? "Colando…" : capsule.enabled ? "Fechar a cápsula e colar no mural" : "Colar no mural"}
      </button>
      <p className="text-center text-xs text-[#8a7b69]">Sua mensagem é anônima, mas o dono revisa antes de aparecer. Ofensas, ameaças e assédio podem ser relatados e levar ao bloqueio.</p>
      </div>
    </form>
  );
}

export function ComposerDialog({ open, onClose, portalTarget = null, ...rest }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const inline = !!portalTarget && open;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !portalTarget && !d.open) d.showModal();
    if ((!open || portalTarget) && d.open) d.close();
  }, [open, portalTarget]);

  // Esc fecha o compositor dentro do mural
  useEffect(() => {
    if (!inline) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inline, onClose]);

  if (inline && portalTarget) {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Deixar uma mensagem"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        className="absolute inset-0 z-50 grid place-items-center bg-black/55 p-2 backdrop-blur-[2px]"
      >
        <div className="flex max-h-full w-[min(100%,50rem)] flex-col overflow-hidden rounded-2xl border border-[#e6d8bd] bg-[#fbf6ea] text-[#2f2218] shadow-[0_1.2rem_3rem_rgba(0,0,0,.55)]">
          <div className="flex items-center justify-between border-b border-[#e6d8bd] px-4 py-1.5">
            <p className="text-xs font-semibold text-[#6b5440]">Deixar uma mensagem anônima</p>
            <button type="button" onClick={onClose} aria-label="Fechar" className={`${ghostButton} !size-8 !rounded-full !p-0`}>
              ×
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-3 text-[14px]">
            <Body {...rest} onClose={onClose} landscape />
          </div>
        </div>
      </div>,
      portalTarget,
    );
  }

  return (
    <dialog
      ref={ref}
      onClose={() => {
        if (!portalTarget) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // clique no fundo escuro
      }}
      aria-label="Deixar uma mensagem"
      className="m-auto max-h-[92dvh] w-[min(94vw,36rem)] overflow-hidden rounded-3xl border border-[#e6d8bd] bg-[#fbf6ea] p-0 text-[#2f2218] shadow-[0_2rem_5rem_rgba(0,0,0,.55)] backdrop:bg-black/60 max-sm:mb-0 max-sm:max-h-[94dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none"
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col max-sm:max-h-[94dvh]">
          <div className="flex items-center justify-between border-b border-[#e6d8bd] px-5 py-3">
            <p className="text-sm font-semibold text-[#6b5440]">Deixar uma mensagem anônima</p>
            <button type="button" onClick={onClose} aria-label="Fechar" className={`${ghostButton} !size-9 !rounded-full !p-0`}>
              ×
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5">
            <Body {...rest} onClose={onClose} />
          </div>
        </div>
      )}
    </dialog>
  );
}
