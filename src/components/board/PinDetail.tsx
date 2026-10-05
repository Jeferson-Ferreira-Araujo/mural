"use client";

import { useEffect, useRef } from "react";
import { isHidden, isSealed, type BoardItem } from "@/lib/types";
import { useState } from "react";
import { MessageView } from "../messages/MessageView";
import { useModeration } from "./ModerationContext";
import { ReportBox } from "../account/PinsModal";
import { Modal } from "../account/Modal";

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
const Flag = () => (
  <svg {...icon}>
    <path d="M5 21V4M5 4h11l-1.8 4L16 12H5" />
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
export function PinDetail({ items, index, onIndex, onClose }: { items: BoardItem[]; index: number | null; onIndex: (i: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = index !== null && !!items[index];
  const mod = useModeration();
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showSecret, setShowSecret] = useState(false); // dono: ver o conteúdo de um pin em segredo (só nesta janela)
  const revealBtn = (flex: string) =>
    showSecret ? null : (
    <button type="button" onClick={() => setShowSecret(true)} className={`${ghost} ${flex} flex items-center justify-center gap-2`}>
      <EyeOpen />
      Exibir Pin
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
  const arrow =
    "grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-white/20 bg-[#17110c]/70 text-white transition active:scale-95 disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]";

  return (
    <>
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label="Ver mensagem em detalhe"
      className="m-auto w-[min(94vw,34rem)] overflow-visible bg-transparent p-0 text-white backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {open && item && index !== null && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex w-full items-center justify-end gap-2 px-1">
            {mod && !isSealed(item) && !isHidden(item) && (
              <button
                type="button"
                disabled={busy}
                aria-label="Relatar abuso"
                title="Relatar abuso"
                aria-expanded={reporting}
                onClick={() => setReporting((v) => !v)}
                className={`${arrow} !border-[#ff9b8f]/50 !text-[#ffb4a8]`}
              >
                <Flag />
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Fechar" className={arrow}>
              ×
            </button>
          </div>
          <div className="flex w-full items-center justify-center gap-3">
            <button type="button" onClick={() => onIndex(index - 1)} disabled={index <= 0} aria-label="Anterior" className={arrow}>
              ‹
            </button>
            <div className="grid min-h-[22rem] min-w-0 flex-1 place-items-center text-[min(26px,5.2vw)]" key={item.id}>
              {/* em destaque o pin aparece limpo (sem o selo no meio); o aviso de pendente vem logo abaixo */}
              <MessageView message={isSealed(item) || isHidden(item) ? item : { ...item, pending: false }} revealSecret={showSecret} />
            </div>
            <button type="button" onClick={() => onIndex(index + 1)} disabled={index >= items.length - 1} aria-label="Próximo" className={arrow}>
              ›
            </button>
          </div>
          {item && !isSealed(item) && !isHidden(item) && item.pending && (
            <p role="status" className="flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-sm font-semibold text-white">
              <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {item.ownerReview ? "Aguardando a sua aprovação" : "Aguardando liberação do dono do mural"}
            </p>
          )}
          {/* sem moderação (ex.: administração): o botão fica sozinho; com moderação ele vai ao lado do botão de segredo */}
          {!mod && item && !isSealed(item) && !isHidden(item) && item.ownerHidden && revealBtn("w-full")}
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
                    <button type="button" disabled={busy} aria-label="Excluir pin" title="Excluir pin" onClick={() => setConfirmDelete(true)} className={`${ghost} grid place-items-center`}>
                      <Trash />
                    </button>
                    {item.ownerHidden && revealBtn("flex-1")}
                    <button type="button" disabled={busy || mod.plan !== "full"} title={mod.plan === "full" ? "" : "Segredo é do PINZ PLUS"} onClick={() => run(() => mod.setSecret(item.id, !item.ownerHidden), false)} className={`${ghost} flex-1`}>
                      <span className="inline-flex items-center justify-center gap-2">
                        {mod.plan !== "full" || !item.ownerHidden ? <EyeClosed /> : <EyeOpen />}
                        {mod.plan !== "full" ? "Segredo (PLUS)" : item.ownerHidden ? "Remover Segredo" : "Colocar em Segredo"}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </dialog>
    {mod && item && !isSealed(item) && !isHidden(item) && (
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Excluir pin?">
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
      <Modal open={reporting} onClose={() => setReporting(false)} title="Relatar abuso">
        <div className="space-y-4">
          <div className="grid place-items-center rounded-2xl border border-dashed border-[#d9c9ad] bg-[#e9d8b6]/60 px-3 py-4">
            <div className="text-[11px]">
              <MessageView message={{ ...item, pending: false }} />
            </div>
          </div>
          <p className="text-sm text-[#4a3826]">O pin é guardado como prova, sai do mural e o espaço fica livre. Escolha o motivo e, se quiser, conte o que aconteceu.</p>
          <ReportBox inModal onCancel={() => setReporting(false)} onSend={(r) => run(() => mod.report(item.id, r), true)} />
        </div>
      </Modal>
    )}
    </>
  );
}
