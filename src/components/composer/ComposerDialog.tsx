"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BOARD_CAPACITY, canUseCapsule, formatsFor, slotsFor, type PlanId } from "@/lib/plans";
import { formatInfo, type Message, type MessageType } from "@/lib/types";
import type { PinPos } from "@/lib/style";
import { FastenerPicker } from "../messages/fasteners";
import { MessageView } from "../messages/MessageView";
import { ghostButton, primaryButton } from "../ui";
import { CapsuleOption, capsuleDateOk, type CapsuleValue } from "./CapsuleOption";
import { enabledFormats, useFeatureFlags } from "@/lib/features";
import { FormatPicker } from "./FormatPicker";
import { FullNotice } from "./FullNotice";
import { SlotPicker } from "./SlotPicker";
import { DrawForm } from "./DrawForm";
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
  /** Nickname de quem está logado: todo pin sai assinado com ele (não existe pin anônimo). */
  signAs?: string | null;
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
    case "draw":
      return <DrawForm onChange={onChange} />;
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

/** Exemplos mostrados na prévia antes de a pessoa preencher (nunca são enviados). */
const SAMPLE: Record<MessageType, DraftMessage> = {
  postit: { type: "postit", color: "yellow", text: "Seu recado aparece aqui" },
  text: { type: "text", variant: "letter", text: "Sua mensagem aparece aqui." },
  list: { type: "list", title: "Sua lista", items: [{ text: "Primeiro item", done: false }, { text: "Segundo item", done: false }] },
  photo: { type: "photo", caption: "", scene: "hills" },
  draw: { type: "draw", caption: "" },
  music: { type: "music", title: "Nome da música", artist: "Artista", caption: "", playerColor: "black" },
  video: { type: "video", caption: "", playerColor: "black" },
  voice: { type: "voice", caption: "", playerColor: "cream" },
  // só o desenho do aparelho (não carrega o mapa)
  place: { type: "place", name: "Nome do lugar", address: "", lat: 0, lon: 0, caption: "", playerColor: "silver", blank: true } as unknown as DraftMessage,
};

/**
 * Compositor de pins (só com conta: o pin sai sempre assinado; quem visita sem conta é avisado antes de abrir).
 * 1) mural lotado → só "Eu tentei deixar um PINZ", sem composição;
 * 2) senão: escolhe um dos formatos liberados NESTE mural → escreve (com a prévia no topo, já com um exemplo) →
 *    (PLUS) opcionalmente Cápsula → cola no mural.
 * O formato escolhido fica no cabeçalho (seta de voltar à esquerda, nome do formato no centro).
 */
function Body({ plan, capacity = BOARD_CAPACITY, taken, fixedSlot = null, sending = false, used, onSend, onTried, triedAlready, onClose, format, onFormat, signAs }: Omit<Props, "open"> & { format: MessageType | null; onFormat: (f: MessageType | null) => void }) {
  const available = slotsFor(plan, capacity);
  // onde colar: começa no primeiro espaço livre, mas o visitante escolhe qualquer um
  // o plano limita QUANTOS pins o mural tem (FREE: 15 de 28), não quais espaços: qualquer espaço livre serve
  const firstFree = Array.from({ length: capacity }, (_, i) => i).find((i) => !taken.includes(i)) ?? null;
  const planLimit = used >= available && firstFree !== null;
  const full = firstFree === null || used >= available;
  const flags = useFeatureFlags();
  const formats = enabledFormats(formatsFor(plan), flags);
  const [draft, setDraft] = useState<DraftMessage | null>(null);
  const [empty, setEmpty] = useState(true); // ainda não dá para enviar
  const [capsule, setCapsule] = useState<CapsuleValue>({ enabled: false, at: "" });
  const [picked, setPicked] = useState<number | null>(null);
  const [pos, setPos] = useState<PinPos>("left"); // onde a tachinha/fita prende (post-it, folha e foto)
  const choice = fixedSlot ?? picked;
  const slot = choice !== null && choice < capacity && !taken.includes(choice) ? choice : firstFree;

  const onDraft = useCallback((d: DraftMessage | null, meta?: { empty?: boolean }) => {
    setDraft(d);
    setEmpty(d === null || !!meta?.empty);
  }, []);

  // voltou para a escolha do formato: zera o rascunho
  useEffect(() => {
    setPos("left");
    if (!format) {
      setDraft(null);
      setEmpty(true);
    }
  }, [format]);

  if (full) return <FullNotice used={used} available={available} planLimit={planLimit} onTried={onTried} triedAlready={triedAlready} onClose={onClose} />;

  if (!format) return <FormatPicker formats={formats} onPick={onFormat} />;

  const canSend = !!signAs && !sending && !!draft && !empty && slot !== null && capsuleDateOk(capsule) && (!capsule.enabled || !!capsule.at);
  const hasPos = format === "postit" || format === "photo"; // só a tachinha muda de lugar; a fita fica sempre no lugar do card
  const withPos = (d: DraftMessage): DraftMessage => (hasPos ? ({ ...d, pos } as DraftMessage) : d);
  const shown = withPos(draft ?? SAMPLE[format]);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft || !canSend || slot === null) return;
        onSend({ message: withPos(draft), slot, capsuleAt: capsule.enabled ? new Date(capsule.at).toISOString() : undefined });
      }}
      className={`space-y-5 ${format !== "draw" ? "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-x-8 lg:space-y-0" : ""}`}
    >
      {/* prévia sempre no topo (e visível ao rolar): já mostra um exemplo antes de digitar */}
      {format !== "draw" && <section aria-label="Prévia" className="sticky -top-5 z-10 -mx-5 -mt-5 bg-[#fbf6ea] px-5 pt-4 pb-3 lg:top-0 lg:z-auto lg:col-start-1 lg:row-start-1 lg:m-0 lg:self-start lg:bg-transparent lg:p-0">
        <div className="rounded-2xl border border-dashed border-[#d9c9ad] bg-[#e9d8b6]/60 px-3 py-3 lg:flex lg:min-h-[30rem] lg:flex-col lg:justify-center lg:py-8">
          <p className="mb-2 text-center text-[10px] font-semibold tracking-wide text-[#8a7b69] uppercase">Prévia no mural</p>
          {hasPos && <p className="mb-2 text-center text-xs text-[#6b5440]">Toque na silhueta para mudar onde o pin prende.</p>}
          <div className="flex justify-center">
            <div className="text-[11px] lg:text-[17px]">
              {capsule.enabled ? (
                <p className="mb-2 max-w-[16em] text-center text-[1.15em] text-[#6b5440]">🔒 No mural ela aparece como uma cápsula fechada até a data escolhida.</p>
              ) : null}
              <div className={empty ? "opacity-70" : ""}>
                <FastenerPicker value={hasPos ? { onPick: setPos } : null}>
                  <MessageView message={{ ...shown, id: "preview", signedBy: signAs ?? undefined } as Message} />
                </FastenerPicker>
              </div>
            </div>
          </div>
        </div>
      </section>}

      <div className="space-y-5 lg:col-start-2 lg:row-start-1">
      <FormFor format={format} onChange={onDraft} />

      {canUseCapsule(plan) && <CapsuleOption value={capsule} onChange={setCapsule} />}

      {(fixedSlot === null || fixedSlot === undefined) && <SlotPicker capacity={capacity} available={capacity} taken={taken} value={slot} onChange={setPicked} />}

      <button type="submit" disabled={!canSend} className={primaryButton}>
        {sending ? "Colando…" : capsule.enabled ? "Fechar a cápsula e colar no mural" : "Colar no mural"}
      </button>
      </div>
    </form>
  );
}

export function ComposerDialog({ open, onClose, ...rest }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [format, setFormat] = useState<MessageType | null>(null);
  const wide = !!format && format !== "draw"; // com prévia: duas colunas no desktop

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // ao fechar, a próxima abertura recomeça pela escolha do formato
  useEffect(() => {
    if (!open) setFormat(null);
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // clique no fundo escuro
      }}
      aria-label="Deixar uma mensagem"
      className={`m-auto max-h-[92dvh] w-[min(94vw,36rem)] ${wide ? "lg:w-[min(94vw,62rem)]" : ""} overflow-hidden rounded-3xl border border-[#e6d8bd] bg-[#fbf6ea] p-0 text-[#2f2218] shadow-[0_2rem_5rem_rgba(0,0,0,.55)] backdrop:bg-black/60 max-sm:mb-0 max-sm:max-h-[94dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none`}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col max-sm:max-h-[94dvh]">
          {/* cabeçalho: voltar (esquerda) · formato escolhido (centro) · fechar (direita) */}
          <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center border-b border-[#e6d8bd] px-4 py-3">
            {format ? (
              <button type="button" onClick={() => setFormat(null)} aria-label="Voltar e trocar o formato" className={`${ghostButton} !size-9 !rounded-lg !p-0`}>
                <svg viewBox="0 0 24 24" className="mx-auto size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m15 5-7 7 7 7" />
                </svg>
              </button>
            ) : (
              <span />
            )}
            <p className="font-title text-center text-lg font-semibold text-[#2f2218]">{format ? formatInfo[format].label : "Coloque um PIN"}</p>
            <button type="button" onClick={onClose} aria-label="Fechar" className={`${ghostButton} !size-9 !rounded-lg !p-0 justify-self-end`}>
              ×
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5">
            <Body {...rest} onClose={onClose} format={format} onFormat={setFormat} />
          </div>
        </div>
      )}
    </dialog>
  );
}
