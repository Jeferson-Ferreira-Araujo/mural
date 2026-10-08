"use client";

import { useEffect, useRef } from "react";
import { isHidden, isSealed, type BoardItem } from "@/lib/types";
import { useState } from "react";
import { MessageView } from "../messages/MessageView";
import { useModeration } from "./ModerationContext";
import { ReportBox } from "../account/PinsModal";
import { Modal } from "../account/Modal";
import { DetailProvider } from "./ListEditContext";
import { ReactionBar } from "./ReactionBar";
import { useReactionsAccess } from "./ReactionsContext";
import { useFeatureFlags } from "@/lib/features";
import { cardToPng, deliverImage } from "@/lib/exportImage";

const icon = { viewBox: "0 0 24 24", className: "size-5 shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
/** Olho aberto: o pin está à vista. */
const EyeOpen = () => (
  <svg {...icon}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
/** Olho fechado (riscado): o pin está em segredo. */
const EyeClosed = () => (
  <svg {...icon}>
    <path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.4-1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
  </svg>
);
const big = { viewBox: "0 0 24 24", className: "size-5 sm:size-6", fill: "none", stroke: "currentColor", strokeWidth: 2.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const ChevronLeft = () => (
  <svg {...big}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);
const ChevronRight = () => (
  <svg {...big}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);
const CloseX = () => (
  <svg {...big}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
const ShareIcon = () => (
  <svg {...big}>
    <circle cx="18" cy="5" r="2.6" />
    <circle cx="6" cy="12" r="2.6" />
    <circle cx="18" cy="19" r="2.6" />
    <path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3" />
  </svg>
);
const Trash = () => (
  <svg {...icon}>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
  </svg>
);

/**
 * Detalhe de um Pinz: no mural com muitos espaços os cards ficam pequenos (só dá para "bater o olho"),
 * então um clique no pin abre o mesmo card em tamanho de leitura, com setas para passar para o vizinho.
 */
export function PinDetail({ items, index, onIndex, onClose, board = "cortica" }: { items: BoardItem[]; index: number | null; onIndex: (i: number) => void; onClose: () => void; /** quadro do mural: o fundo da imagem de compartilhar é ele, desfocado */ board?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = index !== null && !!items[index];
  const mod = useModeration();
  const react = useReactionsAccess();
  const flags = useFeatureFlags();
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [showSecret, setShowSecret] = useState(false); // dono: ver o conteúdo de um pin em segredo (só nesta janela)
  const revealBtn = () => (
    <button type="button" onClick={() => setShowSecret((v) => !v)} aria-pressed={showSecret} className={`${ghost} flex items-center justify-center gap-2`}>
      {showSecret ? <EyeClosed /> : <EyeOpen />}
      {showSecret ? "Esconder PIN" : "Revelar PIN"}
    </button>
  );
  const ghost = "cursor-pointer rounded-xl border border-white/25 bg-[#17110c]/80 px-4 py-3 text-base font-semibold text-white transition hover:bg-[#2b1c12] disabled:cursor-not-allowed disabled:opacity-50";
  // executa a ação e, se for o caso, fecha o destaque (o pin já saiu do mural ou mudou)
  async function run(action: () => Promise<boolean>, closeAfter: boolean) {
    setBusy(true);
    const ok = await action();
    setBusy(false);
    setReporting(false);
    if (ok && closeAfter) onClose();
  }

  // trocar de pin ou fechar o detalhe borra o segredo de novo
  useEffect(() => {
    setShowSecret(false);
    setConfirmDelete(false);
    setShareMsg(null);
  }, [index, open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (index === null) return;
      if (e.key === "ArrowRight" && index < items.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, items.length, onIndex]);

  const item = index !== null ? items[index] : null;
  // só o dono do mural (mod existe só para ele) compartilha, e só pin à vista: nada de segredo, nada aguardando aprovação, nada fechado
  // sempre que o segredo liga/desliga num pin, volta ao estado borrado (quem acabou de habilitar já vê como fica)
  const secretOn = !!item && !isSealed(item) && !isHidden(item) && !!item.ownerHidden;
  useEffect(() => {
    setShowSecret(false);
  }, [item?.id, secretOn]);
  const shareable = !!mod && !!item && !isSealed(item) && !isHidden(item) && !item.ownerHidden && !item.pending;

  async function sharePin() {
    if (sharing || !cardRef.current) return;
    setSharing(true);
    setShareMsg(null);
    try {
      const blob = await cardToPng(cardRef.current);
      const res = await deliverImage(blob, "pinz-pin", "Crie seu mural agora, acesse: https://pinz.digital");
      if (res === "downloaded") setShareMsg("Imagem salva! Agora é só postar.");
    } catch {
      setShareMsg("Não foi possível gerar a imagem agora.");
    } finally {
      setSharing(false);
    }
  }
  const arrow =
    "grid size-10 shrink-0 cursor-pointer sm:size-12 place-items-center rounded-xl border border-white/20 bg-[#17110c]/70 text-white transition active:scale-95 disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]";

  return (
    <>
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label="Ver mensagem em detalhe"
      className="m-auto w-[min(94vw,40rem)] max-h-[96dvh] overflow-y-auto overflow-x-clip bg-transparent p-0 text-white backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {open && item && index !== null && (
        <div className="flex h-[min(96dvh,60rem)] flex-col items-center gap-3">
          <div className="flex w-full items-center justify-end gap-2 px-1">
            {shareable && (
              <button type="button" disabled={sharing} aria-label="Compartilhar este pin" title="Compartilhar este pin" onClick={() => void sharePin()} className={arrow}>
                <ShareIcon />
              </button>
            )}
            {mod && !isSealed(item) && !isHidden(item) && (
              <button
                type="button"
                disabled={busy}
                aria-label="Denunciar"
                title="Denunciar"
                aria-expanded={reporting}
                onClick={() => setReporting((v) => !v)}
                className={`${arrow} !border-[#ff9b8f]/50 !text-[#ffb4a8]`}
              >
                <svg {...big}>
                  <path d="M5 21V4M5 4h11l-1.8 4L16 12H5" />
                </svg>
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Fechar" className={arrow}>
              <CloseX />
            </button>
          </div>
          {shareMsg && (
            <p role="status" className="rounded-xl bg-black/55 px-4 py-2 text-sm font-semibold text-white">
              {shareMsg}
            </p>
          )}
          {item && !isSealed(item) && !isHidden(item) && item.ownerHidden && revealBtn()}
          <div className="flex min-h-0 w-full flex-1 items-center justify-center gap-2 sm:gap-3">
            <button type="button" onClick={() => onIndex(index - 1)} disabled={index <= 0} aria-label="Anterior" className={arrow}>
              <ChevronLeft />
            </button>
            {/* o pin ocupa todo o espaço que sobra entre os botões (em cima e embaixo): o tamanho vem da altura e da largura dessa área, então nunca há barra de rolagem */}
            <div className="relative min-w-0 flex-1 self-stretch [container-type:size]">
            <div className="absolute inset-0 grid place-items-center pt-[1.2em] pb-[2.4em]" style={{ fontSize: "min(34px, calc(100cqh / 23), calc(100cqw / 15))" }} key={item.id}>
              {/* em destaque o pin aparece limpo (sem o selo no meio); o aviso de pendente vem logo abaixo */}
              <DetailProvider value>
                <MessageView message={isSealed(item) || isHidden(item) ? item : { ...item, pending: false }} revealSecret={showSecret} />
              </DetailProvider>
            </div>
            </div>
            <button type="button" onClick={() => onIndex(index + 1)} disabled={index >= items.length - 1} aria-label="Próximo" className={arrow}>
              <ChevronRight />
            </button>
          </div>
          {react && flags.reactions === true && item && !isSealed(item) && !isHidden(item) && !item.pending && <ReactionBar key={item.id} messageId={item.id} current={item.reaction} onChanged={react.onChanged} />}
          {item && !isSealed(item) && !isHidden(item) && item.pending && (
            <p role="status" className="flex items-center gap-2 rounded-xl bg-black/55 px-4 py-2 text-sm font-semibold text-white">
              <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {item.ownerReview ? "Aguardando a sua aprovação" : "Aguardando liberação do dono do mural"}
            </p>
          )}
          {mod && item && !isSealed(item) && !isHidden(item) && (
            <div className="flex w-full flex-col gap-2" role="group" aria-label="Moderar este pin">
              <div className="flex w-full flex-wrap gap-2">
                {item.pending ? (
                  <>
                    <button type="button" disabled={busy} onClick={() => run(() => mod.moderate(item.id, false), true)} className={`${ghost} flex-1`}>
                      Recusar
                    </button>
                    <button type="button" disabled={busy || mod.plan !== "full"} title={mod.plan === "full" ? "Aprova e deixa em segredo: os visitantes veem o pin borrado" : "Segredo é do PINZ PLUS"} onClick={() => run(() => mod.moderate(item.id, true, true), true)} className={`${ghost} flex-1`}>
                      <span className="inline-flex items-center justify-center gap-2">
                        <EyeClosed />
                        {mod.plan === "full" ? "Aprovar como segredo" : "Segredo (PLUS)"}
                      </span>
                    </button>
                    <button type="button" disabled={busy} onClick={() => run(() => mod.moderate(item.id, true), true)} className="min-w-[8rem] flex-1 cursor-pointer rounded-xl bg-[#d9a21b] px-4 py-3 text-base font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] disabled:opacity-60">
                      Aprovar
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={busy} aria-label="Excluir PIN" title="Excluir PIN" onClick={() => setConfirmDelete(true)} className={`${ghost} grid place-items-center sm:flex sm:flex-1 sm:items-center sm:justify-center sm:gap-2`}>
                      <Trash />
                      <span className="hidden sm:inline">Excluir PIN</span>
                    </button>
                    <button type="button" disabled={busy || mod.plan !== "full"} title={mod.plan === "full" ? "" : "Segredo é do PINZ PLUS"} onClick={() => {
                      setShowSecret(false);
                      void run(() => mod.setSecret(item.id, !item.ownerHidden), false);
                    }} className={`${ghost} flex-1`}>
                      {mod.plan !== "full" ? "Segredo (PLUS)" : item.ownerHidden ? "Desabilitar segredo" : "Habilitar segredo"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </dialog>
    {open && shareable && item && !isSealed(item) && !isHidden(item) && (
      <div
        ref={cardRef}
        aria-hidden
        inert
        className="pointer-events-none flex items-center justify-center overflow-hidden text-[24px]"
        style={{ position: "fixed", left: -100000, top: 0, width: 540, height: 675, background: "#3b2616" }}
      >
        {/* fundo: o quadro do mural (imagem já desfocada), como se o pin estivesse preso nele */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/img/blur/${board}.webp`} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "relative", marginBottom: 118 }}>
          <MessageView message={{ ...item, pending: false, ownerHidden: false, canEdit: false, signedBy: undefined, reaction: undefined }} revealSecret />
        </div>
        {/* rodapé: logo e convite numa etiqueta clara (legível em qualquer quadro), longe do pin */}
        <div style={{ position: "absolute", left: 40, right: 40, bottom: 34, display: "flex", flexDirection: "row", alignItems: "center", gap: 16, padding: "12px 18px 12px 14px", borderRadius: 20, background: "rgba(251,246,234,.93)", boxShadow: "0 6px 18px rgba(0,0,0,.28)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/pinz-logo.webp" alt="" draggable={false} style={{ height: 64, flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <p style={{ margin: 0, fontFamily: "var(--font-fredoka), system-ui, sans-serif", fontSize: 16, fontWeight: 600, color: "#4a3826", textAlign: "left", lineHeight: 1.25 }}>Crie seu mural e compartilhe momentos especiais!</p>
            <p style={{ margin: 0, fontFamily: "var(--font-fredoka), system-ui, sans-serif", fontSize: 17, fontWeight: 700, color: "#2f2218", textAlign: "left" }}>Acesse: pinz.digital</p>
          </div>
        </div>
      </div>
    )}
    {mod && item && !isSealed(item) && !isHidden(item) && (
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="" label="Excluir PIN">
        <div className="space-y-4">
          <p className="text-sm text-[#4a3826]">Tem certeza que deseja excluir este pin? Essa ação não poderá ser desfeita.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} className="flex-1 cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-3 text-sm font-semibold text-[#4a3826] transition hover:bg-white">
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirmDelete(false);
                void run(() => mod.moderate(item.id, false), true);
              }}
              className="flex-1 cursor-pointer rounded-xl bg-[#a23b2a] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#8c3022] disabled:opacity-60"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>
    )}
    {mod && item && !isSealed(item) && !isHidden(item) && (
      <Modal open={reporting} onClose={() => setReporting(false)} title="Denunciar">
        <div className="space-y-4">
          <ReportBox inModal onCancel={() => setReporting(false)} onSend={(r) => run(() => mod.report(item.id, r), true)} />
        </div>
      </Modal>
    )}
    </>
  );
}
