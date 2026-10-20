"use client";

import { useRef, useState } from "react";
import { cardToPng, deliverImage } from "@/lib/exportImage";
import { useModeration } from "../board/ModerationContext";
import { useBadges } from "./BadgeContext";
import { shapeOfStyle } from "@/lib/displayShape";
import { Modal } from "../account/Modal";
import { DetailProvider } from "../board/ListEditContext";
import { DisplayCard, withLiveText, type DisplayData } from "../widgets";
import { SecretCover } from "./SecretCover";
import { ghostButton } from "../ui";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

const NAME: Record<string, string> = { bible: "Versículo do dia", motivation: "Frase do dia", clock: "Relógio", weather: "Clima", book: "Leitura de livro", top3: "Top 3", poll: "Enquete", countdown: "Contador regressivo", daycount: "Contador de dias" };

/**
 * Detalhe de um pin da loja: o widget em tamanho grande, como quem passa por ele no mural quer ler (frase, hora, tempo).
 * Quem vê o mural toca no widget; o dono abre pelo botão de ampliar nos controles (ou com duplo clique no computador).
 */
export function DisplayDetail({ data, onClose }: { data: DisplayData; onClose: () => void }) {
  const tl = useLit();
  const tx = useTranslations("components.badges.DisplayDetail");
  const [copied, setCopied] = useState(false);
  const { badges, editable, removeDisplay, setDisplaySecret } = useBadges();
  const mod = useModeration();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hidden = !!badges.find((b) => b.id === data.id)?.hidden;
  const own = editable && !!data.id;
  const live = withLiveText(data);
  const pages = Math.max(1, data.pages ?? 1);
  const readN = Math.min(pages, Math.max(0, data.read ?? 0));
  const bookText = data.product === "book" ? `Estou lendo${data.title ? ` “${data.title}”` : " um livro"}: ${readN} de ${pages} páginas (${Math.round((readN / pages) * 100)}%).` : null;
  const text = live.text ? `“${live.text}”${live.ref ? ` — ${live.ref}` : ""}` : bookText;

  async function share() {
    if (!text) return;
    try {
      if (navigator.share) {
        await navigator.share({ text: `${text}\n\nVia Pinz · pinz.digital` });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n\nVia Pinz · pinz.digital`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* compartilhamento cancelado */
    }
  }

  async function shareImage() {
    if (busy || !cardRef.current) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await deliverImage(await cardToPng(cardRef.current), "pinz-display", "Crie seu mural agora, acesse: https://pinz.digital");
      if (res === "downloaded") setMsg(tx("m_imagemSalvaAgoraESo"));
    } catch {
      setMsg(tx("m_naoFoiPossivelGerarA"));
    } finally {
      setBusy(false);
    }
  }

  const title = NAME[data.product] ?? tl("Display");
  return (
    <Modal open onClose={onClose} title={title} label={title}>
      <div className="space-y-4">
        <div className="flex justify-center overflow-hidden rounded-2xl bg-[#e9d8b6]/60 px-2 py-6">
          {/* o widget tem 24 em de largura: a fonte do contêiner o leva a quase toda a largura da janela */}
          <div style={{ fontSize: shapeOfStyle(data.style) === "square" ? "calc(min(66vw, 24rem, 40dvh) / 12)" : shapeOfStyle(data.style) === "tall" ? "calc(min(54vw, 18rem, 30dvh) / 12)" : "calc(min(82vw, 31rem, 80dvh) / 24)" }}>
            <DetailProvider value>
              {hidden && !reveal ? <SecretCover style={data.style} /> : <DisplayCard data={data} badgeId={data.id} />}
            </DetailProvider>
          </div>
        </div>
        {own && hidden && (
          <button type="button" onClick={() => setReveal((v) => !v)} aria-pressed={reveal} className={`${ghostButton} w-full`}>
            {reveal ? tl("Esconder display") : tl("Revelar display")}
          </button>
        )}
        {text ? (
          <button type="button" onClick={() => void share()} className={`${ghostButton} w-full`}>
            {copied ? tl("Texto copiado!") : tl("Compartilhar o texto")}
          </button>
        ) : (
          own && (
            <button type="button" disabled={busy} onClick={() => void shareImage()} className={`${ghostButton} w-full`}>
              {tx("compartilhar")}</button>
          )
        )}
        {msg && (
          <p role="status" className="text-center text-sm font-semibold text-[#4a3826]">
            {msg}
          </p>
        )}
        {own && data.id && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirm(true)} className={`${ghostButton} flex-1`}>
              {tx("excluirDisplay")}</button>
            <button
              type="button"
              disabled={busy || (!!mod && mod.plan !== "full")}
              title={!mod || mod.plan === "full" ? "" : tx("m_segredoEDoPinz")}
              onClick={async () => {
                setBusy(true);
                setReveal(false);
                await setDisplaySecret(data.id!, !hidden);
                setBusy(false);
              }}
              className={`${ghostButton} flex-1`}
            >
              {mod && mod.plan !== "full" ? tl("Segredo (PINZ+)") : hidden ? tl("Desabilitar segredo") : tl("Habilitar segredo")}
            </button>
          </div>
        )}
      </div>
      {own && !text && (
        <div ref={cardRef} aria-hidden inert className="pointer-events-none flex items-center justify-center overflow-hidden text-[24px]" style={{ position: "fixed", left: -100000, top: 0, width: 540, height: 675, background: "#3b2616" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/blur/cortica.webp" alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "relative", marginBottom: 118, fontSize: 28 }}>
            <DisplayCard data={data} />
          </div>
          <div style={{ position: "absolute", left: 40, right: 40, bottom: 34, display: "flex", alignItems: "center", gap: 16, padding: "12px 18px 12px 14px", borderRadius: 20, background: "rgba(251,246,234,.93)", boxShadow: "0 6px 18px rgba(0,0,0,.28)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/pinz-logo.webp" alt="" draggable={false} style={{ height: 64, flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <p style={{ margin: 0, fontFamily: "var(--font-jakarta), system-ui, sans-serif", fontSize: 16, fontWeight: 600, color: "#4a3826", lineHeight: 1.25 }}>{tx("crieSeuMuralECompartilhe")}</p>
              <p style={{ margin: 0, fontFamily: "var(--font-jakarta), system-ui, sans-serif", fontSize: 17, fontWeight: 700, color: "#2f2218" }}>{tx("acessePinzDigital")}</p>
            </div>
          </div>
        </div>
      )}
      {own && data.id && (
        <Modal open={confirm} onClose={() => setConfirm(false)} title={tx("excluirDisplay")} label={tx("excluirDisplay")}>
          <div className="space-y-4">
            <p className="text-sm text-[#4a3826]">{tx("temCertezaQueDesejaExcluir")}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirm(false)} className="flex-1 cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-3 text-sm font-semibold text-[#4a3826] transition hover:bg-white">
                {tx("cancelar")}</button>
              <button
                type="button"
                onClick={() => {
                  setConfirm(false);
                  removeDisplay(data.id!);
                  onClose();
                }}
                className="flex-1 cursor-pointer rounded-xl bg-[#a23b2a] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#8c3022]"
              >
                {tx("excluir")}</button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
