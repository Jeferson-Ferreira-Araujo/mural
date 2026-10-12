"use client";

import { useState } from "react";
import { shapeOfStyle } from "@/lib/displayShape";
import { Modal } from "../account/Modal";
import { DetailProvider } from "../board/ListEditContext";
import { DisplayCard, withLiveText, type DisplayData } from "../widgets";
import { ghostButton } from "../ui";

const NAME: Record<string, string> = { bible: "Versículo do dia", motivation: "Frase do dia", clock: "Relógio", weather: "Clima", book: "Leitura de livro", top3: "Top 3", song: "Música favorita", countdown: "Contador regressivo", daycount: "Contador de dias" };

/**
 * Detalhe de um pin da loja: o widget em tamanho grande, como quem passa por ele no mural quer ler (frase, hora, tempo).
 * Quem vê o mural toca no widget; o dono abre pelo botão de ampliar nos controles (ou com duplo clique no computador).
 */
export function DisplayDetail({ data, onClose }: { data: DisplayData; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
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

  const title = NAME[data.product] ?? "Display";
  return (
    <Modal open onClose={onClose} title={title} label={title}>
      <div className="space-y-4">
        <div className="flex justify-center overflow-hidden rounded-2xl bg-[#e9d8b6]/60 px-2 py-6">
          {/* o widget tem 24 em de largura: a fonte do contêiner o leva a quase toda a largura da janela */}
          <div style={{ fontSize: shapeOfStyle(data.style) === "square" ? "calc(min(66vw, 24rem) / 12)" : shapeOfStyle(data.style) === "tall" ? "calc(min(54vw, 18rem) / 12)" : "calc(min(82vw, 31rem) / 24)" }}>
            <DetailProvider value>
              <DisplayCard data={data} />
            </DetailProvider>
          </div>
        </div>
        {text && (
          <button type="button" onClick={() => void share()} className={`${ghostButton} w-full`}>
            {copied ? "Texto copiado!" : "Compartilhar o texto"}
          </button>
        )}
      </div>
    </Modal>
  );
}
