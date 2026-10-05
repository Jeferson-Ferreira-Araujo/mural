"use client";

import { useEffect, useRef } from "react";
import { formatInfo, isHidden, isSealed, type BoardItem } from "@/lib/types";
import { useState } from "react";
import { MessageView } from "../messages/MessageView";
import { useModeration } from "./ModerationContext";
import { ReportBox } from "../account/PinsModal";

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
  const [showSecret, setShowSecret] = useState(false); // dono: ver o conteúdo de um pin em segredo (só nesta janela)
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
  const label = item ? (isSealed(item) ? "Cápsula PINZ" : isHidden(item) ? "Pin em segredo" : formatInfo[item.type].label) : "";
  const arrow =
    "grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-white/20 bg-[#17110c]/70 text-white transition active:scale-95 disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]";

  return (
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
          <div className="flex w-full items-center justify-between px-1">
            <p className="text-sm font-semibold text-white/80">
              {label} · {index + 1} de {items.length}
            </p>
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
          {item && !isSealed(item) && !isHidden(item) && item.ownerHidden && (
            <button type="button" onClick={() => setShowSecret((v) => !v)} aria-pressed={showSecret} className={`${ghost} w-full`}>
              {showSecret ? "🙈 Esconder o conteúdo de novo" : "👁 Ver o conteúdo (só para mim)"}
            </button>
          )}
          {item && !isSealed(item) && !isHidden(item) && item.ownerHidden && (
            <p role="status" className="flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-sm font-semibold text-white">
              <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor" aria-hidden>
                <path d="M7 10V8a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
              </svg>
              Segredo: os visitantes veem este pin borrado
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
                      {mod.plan === "full" ? "🔒 Aprovar como segredo" : "🔒 Segredo (PLUS)"}
                    </button>
                    <button type="button" disabled={busy} onClick={() => run(() => mod.moderate(item.id, true), true)} className="min-w-[8rem] flex-1 cursor-pointer rounded-xl bg-[#d9a21b] px-4 py-3 text-base font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] disabled:opacity-60">
                      Aprovar
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={busy} onClick={() => run(() => mod.moderate(item.id, false), true)} className={`${ghost} flex-1`}>
                      Remover
                    </button>
                    <button type="button" disabled={busy || mod.plan !== "full"} title={mod.plan === "full" ? "" : "Segredo é do PINZ PLUS"} onClick={() => run(() => mod.setSecret(item.id, !item.ownerHidden), false)} className={`${ghost} flex-1`}>
                      {mod.plan !== "full" ? "🔒 Segredo (PLUS)" : item.ownerHidden ? "🔓 Tornar visível para todos" : "🔒 Deixar em segredo"}
                    </button>
                  </>
                )}
                <button type="button" disabled={busy} aria-expanded={reporting} onClick={() => setReporting((v) => !v)} className={`${ghost} flex-1 !border-[#ff9b8f]/50 !text-[#ffb4a8]`}>
                  🚩 Relatar abuso
                </button>
              </div>
              {reporting && <ReportBox onCancel={() => setReporting(false)} onSend={(r) => run(() => mod.report(item.id, r), true)} />}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
