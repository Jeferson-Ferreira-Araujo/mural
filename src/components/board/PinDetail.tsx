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
import { badgeDef, badgeSrc } from "@/lib/badges";
import { useBadges } from "../badges/BadgeContext";
import { DisplayCard, type DisplayData } from "../widgets";
import { getBrowserSupabase } from "@/lib/supabase";

/** Botton que está sobre o pin no mural: posição (relativa ao pin), tamanho e inclinação, para aparecer igual no detalhe. */
type Over = { id: string; key: number; rot: number; rx: number; ry: number; wr: number };

function BadgesOver({ list }: { list: Over[] }) {
  return (
    <>
      {list.map((o) => {
        const d = badgeDef(o.key);
        if (!d) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={o.id}
            src={badgeSrc(o.key)}
            alt=""
            draggable={false}
            className="pointer-events-none absolute z-[35] select-none"
            style={{ left: `${50 + o.rx * 100}%`, top: `${50 + o.ry * 100}%`, width: `${o.wr * 100}%`, aspectRatio: d.ratio, transform: `translate(-50%, -50%) rotate(${o.rot}deg)`, filter: "drop-shadow(0.12em 0.22em 0.2em rgba(30,12,0,.5))" }}
          />
        );
      })}
    </>
  );
}

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
/** Widget da loja (relógio, clima, frase…) na fila do detalhe: passa-se de um pin para o widget com as mesmas setas. */
export type WidgetEntry = { id: string; widget: true; data: DisplayData };
export type DetailEntry = BoardItem | WidgetEntry;

export function PinDetail({ items, index, onIndex, onClose, board = "cortica" }: { items: DetailEntry[]; index: number | null; onIndex: (i: number) => void; onClose: () => void; /** quadro do mural: o fundo da imagem de compartilhar é ele, desfocado */ board?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = index !== null && !!items[index];
  const mod = useModeration();
  const react = useReactionsAccess();
  const { badges: placedBadges } = useBadges();
  const [over, setOver] = useState<Over[]>([]);
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
  const ghost = "cursor-pointer rounded-xl border border-white/25 bg-[#17110c]/80 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2b1c12] disabled:cursor-not-allowed disabled:opacity-50";
  // quem deixou o pin pode excluí-lo a qualquer momento (aguardando aprovação ou já aprovado), mesmo no mural de outra pessoa
  async function deleteOwn(id: string): Promise<boolean> {
    const { error } = await getBrowserSupabase().rpc("delete_own_pin", { p_id: id });
    if (!error) window.dispatchEvent(new Event("pinz:reload-board"));
    return !error;
  }
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

  const entry = index !== null ? items[index] : null;
  const widget = entry && "widget" in entry ? entry : null; // este item da fila é um widget da loja
  const item: BoardItem | null = entry && !widget ? (entry as BoardItem) : null;
  const [wCopied, setWCopied] = useState(false);
  const wText = widget?.data.text ? `“${widget.data.text}”${widget.data.ref ? ` — ${widget.data.ref}` : ""}` : null;
  async function shareWidgetText() {
    if (!wText) return;
    try {
      if (navigator.share) {
        await navigator.share({ text: `${wText}\n\nVia Pinz · pinz.digital` });
        return;
      }
      await navigator.clipboard.writeText(`${wText}\n\nVia Pinz · pinz.digital`);
      setWCopied(true);
      window.setTimeout(() => setWCopied(false), 2500);
    } catch {
      /* compartilhamento cancelado */
    }
  }

  // bottons que estão sobre este pin no mural: aparecem no detalhe na mesma posição (relativa ao pin) e no mesmo tamanho proporcional
  const itemId = item && !isSealed(item) && !isHidden(item) ? item.id : null;
  useEffect(() => {
    if (!open || !itemId) {
      setOver([]);
      return;
    }
    const vis = (el: Element) => (el as HTMLElement).offsetParent !== null && el.getBoundingClientRect().width > 0;
    const pin = [...document.querySelectorAll<HTMLElement>(`[data-pin-id="${CSS.escape(itemId)}"]`)].find(vis);
    if (!pin) {
      setOver([]);
      return;
    }
    const p = pin.getBoundingClientRect();
    const out: Over[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("[data-badge-id]")) {
      if (!vis(el)) continue;
      const b = el.getBoundingClientRect();
      const ix = Math.max(0, Math.min(b.right, p.right) - Math.max(b.left, p.left));
      const iy = Math.max(0, Math.min(b.bottom, p.bottom) - Math.max(b.top, p.top));
      if (ix * iy < b.width * b.height * 0.2) continue; // só os que realmente cobrem o pin
      const pb = placedBadges.find((x) => x.id === el.dataset.badgeId);
      if (!pb) continue;
      // escala da tela (zoom do quadro): o pin pode estar inclinado, então o tamanho dele vem do layout, não do retângulo da tela
      const layer = el.closest<HTMLElement>("[data-badge-layer]");
      const sc = layer && layer.offsetWidth ? layer.getBoundingClientRect().width / layer.offsetWidth : 1;
      const pw = (pin.offsetWidth || 1) * sc;
      const ph = (pin.offsetHeight || 1) * sc;
      out.push({ id: pb.id, key: pb.key, rot: pb.rotation ?? 0, rx: (b.left + b.width / 2 - (p.left + p.width / 2)) / pw, ry: (b.top + b.height / 2 - (p.top + p.height / 2)) / ph, wr: el.offsetWidth / (pin.offsetWidth || 1) });
    }
    setOver(out);
  }, [open, itemId, placedBadges]);
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
  // tamanho do pin em "em" (altura e largura): a fonte é calculada para o pin ocupar o máximo possível da área livre
  const fit = (() => {
    if (widget) return { h: 13, w: 25.5 }; // widgets: 24 em de largura por 12 de altura
    if (!item || isSealed(item) || isHidden(item)) return { h: 21, w: 16 };
    if (item.type === "photo") {
      const r = Math.min(2, Math.max(0.5, item.ratio ?? 1));
      const pw = Math.min(12.2, 14 * r);
      return { h: 4.6 + pw / r + (item.caption ? 3.8 : 0), w: Math.max(pw + 1.8, 8.6) + 1.4 };
    }
    // players e mapa são cartões baixos (14em de largura, ~10em de altura); a legenda é um papelzinho que pende embaixo
    if (item.type === "place" || item.type === "voice" || item.type === "video" || item.type === "music") return { h: 12.5 + ("caption" in item && item.caption ? 5.5 : 0), w: 16 };
    if (item.type === "draw") return { h: 19 + ("caption" in item && item.caption ? 4 : 0), w: 17 };
    return { h: 23, w: 16 };
  })();
  const arrow =
    "grid size-10 shrink-0 cursor-pointer sm:size-12 place-items-center rounded-xl border border-white/20 bg-[#17110c]/70 text-white transition active:scale-95 disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]";

  // botão de compartilhar com o nome ao lado do ícone (o ícone sozinho ficava pequeno)
  const shareBtn = `${arrow} !w-auto gap-2 px-4 text-sm font-semibold`;

  return (
    <>
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label="Ver mensagem em detalhe"
      className="m-auto w-[min(96vw,64rem)] max-h-[96dvh] overflow-y-auto overflow-x-clip bg-transparent p-0 text-white backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {open && entry && index !== null && (
        <div className="flex h-[min(96dvh,60rem)] flex-col items-center gap-3">
          <div className="flex w-full items-center justify-center gap-2 px-1">
            {shareable && (
              <button type="button" disabled={sharing} aria-label="Compartilhar este pin" title="Compartilhar este pin" onClick={() => void sharePin()} className={shareBtn}>
                <ShareIcon />
                Compartilhar
              </button>
            )}
            {/* frase ou versículo: o mesmo botão de compartilhar de cima leva o texto */}
            {widget && wText && (
              <button type="button" aria-label="Compartilhar o texto" title="Compartilhar o texto" onClick={() => void shareWidgetText()} className={shareBtn}>
                <ShareIcon />
                {wCopied ? "Copiado!" : "Compartilhar"}
              </button>
            )}
            {mod && item && !isSealed(item) && !isHidden(item) && !item.mine && item.pending && ( // só enquanto aguarda aprovação: depois de aprovado, o dono usa Excluir PIN
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
            <div className="absolute inset-0 grid place-items-center pt-[1.2em] pb-[1.4em]" style={{ fontSize: `min(72px, calc(100cqh / ${fit.h}), calc(100cqw / ${fit.w}))` }} key={entry.id}>
              {/* em destaque o pin aparece limpo (sem o selo no meio); o aviso de pendente vem logo abaixo */}
              <DetailProvider value>
                <div className="relative">
                  {widget ? (
                    <DisplayCard data={widget.data} />
                  ) : item ? (
                    <>
                      <MessageView message={isSealed(item) || isHidden(item) ? item : { ...item, pending: false }} revealSecret={showSecret} />
                      <BadgesOver list={over} />
                    </>
                  ) : null}
                </div>
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
          {!mod && item && !isSealed(item) && !isHidden(item) && item.mine && (
            <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)} className={`${ghost} flex items-center justify-center gap-2`}>
              <Trash />
              Excluir meu PIN
            </button>
          )}
          {mod && item && !isSealed(item) && !isHidden(item) && (
            <div className="flex w-full flex-col items-center gap-2" role="group" aria-label="Moderar este pin">
              <div className="flex w-full flex-wrap justify-center gap-2">
                {item.pending ? (
                  <>
                    <button type="button" disabled={busy} onClick={() => run(() => mod.moderate(item.id, false), true)} className={`${ghost}`}>
                      Recusar
                    </button>
                    <button type="button" disabled={busy || mod.plan !== "full"} title={mod.plan === "full" ? "Aprova e deixa em segredo: os visitantes veem o pin borrado" : "Segredo é do PINZ+"} onClick={() => run(() => mod.moderate(item.id, true, true), true)} className={`${ghost}`}>
                      <span className="inline-flex items-center justify-center gap-2">
                        <EyeClosed />
                        {mod.plan === "full" ? "Aprovar como segredo" : "Segredo (PINZ+)"}
                      </span>
                    </button>
                    <button type="button" disabled={busy} onClick={() => run(() => mod.moderate(item.id, true), true)} className="cursor-pointer rounded-xl bg-[#d9a21b] px-6 py-2.5 text-sm font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] disabled:opacity-60">
                      Aprovar
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={busy} aria-label="Excluir PIN" title="Excluir PIN" onClick={() => setConfirmDelete(true)} className={`${ghost} grid place-items-center sm:flex sm:items-center sm:justify-center sm:gap-2`}>
                      <Trash />
                      <span className="hidden sm:inline">Excluir PIN</span>
                    </button>
                    <button type="button" disabled={busy || mod.plan !== "full"} title={mod.plan === "full" ? "" : "Segredo é do PINZ+"} onClick={() => {
                      setShowSecret(false);
                      void run(() => mod.setSecret(item.id, !item.ownerHidden), false);
                    }} className={`${ghost}`}>
                      {mod.plan !== "full" ? "Segredo (PINZ+)" : item.ownerHidden ? "Desabilitar segredo" : "Habilitar segredo"}
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
          <div style={{ position: "relative" }}>
            <MessageView message={{ ...item, pending: false, ownerHidden: false, canEdit: false, signedBy: undefined, reaction: undefined }} revealSecret />
            <BadgesOver list={over} />
          </div>
        </div>
        {/* rodapé: logo e convite numa etiqueta clara (legível em qualquer quadro), longe do pin */}
        <div style={{ position: "absolute", left: 40, right: 40, bottom: 34, display: "flex", flexDirection: "row", alignItems: "center", gap: 16, padding: "12px 18px 12px 14px", borderRadius: 20, background: "rgba(251,246,234,.93)", boxShadow: "0 6px 18px rgba(0,0,0,.28)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/pinz-logo.webp" alt="" draggable={false} style={{ height: 64, flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <p style={{ margin: 0, fontFamily: "var(--font-jakarta), system-ui, sans-serif", fontSize: 16, fontWeight: 600, color: "#4a3826", textAlign: "left", lineHeight: 1.25 }}>Crie seu mural e compartilhe momentos especiais!</p>
            <p style={{ margin: 0, fontFamily: "var(--font-jakarta), system-ui, sans-serif", fontSize: 17, fontWeight: 700, color: "#2f2218", textAlign: "left" }}>Acesse: pinz.digital</p>
          </div>
        </div>
      </div>
    )}
    {item && !isSealed(item) && !isHidden(item) && (mod || item.mine) && (
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Excluir PIN" label="Excluir PIN">
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
                void run(() => (mod ? mod.moderate(item.id, false) : deleteOwn(item.id)), true);
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
