"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { canUseCapsule, formatsFor, slotsFor, type PlanId } from "@/lib/plans";
import { formatInfo, type Message, type MessageType } from "@/lib/types";
import { MessageView } from "../messages/MessageView";
import { ghostButton, primaryButton } from "../ui";
import { CapsuleOption, capsuleDateOk, type CapsuleValue } from "./CapsuleOption";
import { FormatPicker } from "./FormatPicker";
import { FullNotice } from "./FullNotice";
import { ListForm, MusicForm, PhotoForm, PostItForm, TextForm, VideoForm } from "./forms";
import type { DraftMessage, SendPayload } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  plan: PlanId;
  /** Quantas mensagens o mural já tem. */
  used: number;
  onSend: (payload: SendPayload) => void;
  onTried: () => void;
  triedAlready: boolean;
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
  }
}

/**
 * Compositor do visitante (quem visita NUNCA paga nem se cadastra).
 * 1) mural lotado → só "Eu tentei deixar um PINZ", sem composição;
 * 2) senão: escolhe um dos formatos liberados NESTE mural → escreve → (FULL) opcionalmente Cápsula → cola no mural.
 */
function Body({ plan, used, onSend, onTried, triedAlready, onClose }: Omit<Props, "open">) {
  const available = slotsFor(plan);
  const full = used >= available;
  const formats = formatsFor(plan);
  const [format, setFormat] = useState<MessageType | null>(null);
  const [draft, setDraft] = useState<DraftMessage | null>(null);
  const [capsule, setCapsule] = useState<CapsuleValue>({ enabled: false, at: "" });

  const onDraft = useCallback((d: DraftMessage | null) => setDraft(d), []);

  if (full) return <FullNotice used={used} available={available} onTried={onTried} triedAlready={triedAlready} onClose={onClose} />;

  if (!format) return <FormatPicker formats={formats} onPick={setFormat} />;

  const canSend = !!draft && capsuleDateOk(capsule) && (!capsule.enabled || !!capsule.at);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft || !canSend) return;
        onSend({ message: draft, capsuleAt: capsule.enabled ? new Date(capsule.at).toISOString() : undefined });
      }}
      className="space-y-5"
    >
      <div>
        <button type="button" onClick={() => { setFormat(null); setDraft(null); }} className="cursor-pointer text-sm font-semibold text-[#6b5440] underline">
          ← Trocar formato
        </button>
        <h3 className="font-title mt-1 text-xl font-semibold">{formatInfo[format].label}</h3>
      </div>

      <FormFor format={format} onChange={onDraft} />

      {canUseCapsule(plan) && <CapsuleOption value={capsule} onChange={setCapsule} />}

      {draft && (
        <section aria-label="Prévia" className="rounded-2xl border border-dashed border-[#d9c9ad] bg-[#e9d8b6]/50 px-3 py-6">
          <p className="mb-4 text-center text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">Prévia no mural</p>
          <div className="flex justify-center">
            <div className="text-[15px]">
              {capsule.enabled ? (
                <p className="mb-3 max-w-[14em] text-center text-sm text-[#6b5440]">🔒 No mural ela aparece como uma cápsula fechada até a data escolhida. O conteúdo só aparece aqui na prévia.</p>
              ) : null}
              <MessageView message={{ ...draft, id: "preview" } as Message} />
            </div>
          </div>
        </section>
      )}

      <button type="submit" disabled={!canSend} className={primaryButton}>
        {capsule.enabled ? "Fechar a cápsula e colar no mural" : "Colar no mural"}
      </button>
      <p className="text-center text-xs text-[#8a7b69]">Sua mensagem é anônima.</p>
    </form>
  );
}

export function ComposerDialog({ open, onClose, ...rest }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
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
