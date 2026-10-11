"use client";

import { useState } from "react";
import { Modal } from "../account/Modal";
import { DisplayCard, withLiveText, type DisplayData } from "../widgets";
import { ghostButton } from "../ui";

const NAME: Record<string, string> = { bible: "Versículo do dia", motivation: "Frase do dia", clock: "Relógio", weather: "Clima" };

/**
 * Detalhe de um pin da loja: o widget em tamanho grande, como quem passa por ele no mural quer ler (frase, hora, tempo).
 * Quem vê o mural toca no widget; o dono abre pelo botão de ampliar nos controles (ou com duplo clique no computador).
 */
export function DisplayDetail({ data, onClose }: { data: DisplayData; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const live = withLiveText(data);
  const text = live.text ? `“${live.text}”${live.ref ? ` — ${live.ref}` : ""}` : null;

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
          <div style={{ fontSize: "calc(min(82vw, 31rem) / 24)" }}>
            <DisplayCard data={data} />
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
