"use client";

import { useEffect, useState } from "react";
import { companyDisplayName } from "@/lib/reserved";
import { Modal } from "./Modal";

const key = (uid: string) => `pinz:tip:${uid}`;
const RECENT_MS = 7 * 24 * 60 * 60 * 1000;

/** Boas-vindas ("Olá <usuário>") com as instruções de uso: aparece uma vez, no primeiro acesso ao próprio mural depois de criar a conta. */
export function FirstTimeTip({ uid, createdAt, ready, nick, company = false }: { uid?: string; createdAt?: string; /** o mural já está na tela */ ready: boolean; /** nome de usuário (aparece em "Olá ...") */ nick: string; /** conta de empresa (nome reservado): boas-vindas própria */ company?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || !uid || !createdAt) return;
    if (Date.now() - new Date(createdAt).getTime() > RECENT_MS) return; // só contas novas
    try {
      if (localStorage.getItem(key(uid))) return;
    } catch {
      return;
    }
    const t = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(t);
  }, [ready, uid, createdAt]);

  function close() {
    setOpen(false);
    try {
      if (uid) localStorage.setItem(key(uid), "1");
    } catch {}
  }

  return (
    <Modal open={open} onClose={close} title={`Olá ${company ? companyDisplayName(nick) : nick}`}>
      <p className="mb-4 text-[15px] leading-relaxed">{company ? "Que bom ter você por aqui. Esperamos que essa seja uma experiência muito boa para você e seus clientes." : "Que bom ter você por aqui! Veja como usar:"}</p>
      <ul className="space-y-3 text-[15px]">
        <li className="flex gap-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f1e7d2] text-lg">
            📌
          </span>
          <p><strong>Colar um pin:</strong> clique (ou toque) num espaço vazio do mural.</p>
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f1e7d2] text-lg">
            🤏
          </span>
          <p><strong>Zoom:</strong> pinça com dois dedos ou toque duplo. “Ver tudo” volta ao mural inteiro.</p>
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f1e7d2] text-lg">
            ✋
          </span>
          <p><strong>Mover:</strong> com o mural aproximado, arraste para ver o resto.</p>
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f1e7d2] text-lg">
            🎨
          </span>
          <p><strong>Bottons:</strong> arraste da barra de baixo para o mural. Para tirar, arraste de volta.</p>
        </li>
      </ul>
      <button type="button" onClick={close} className="mt-6 w-full cursor-pointer rounded-xl bg-[#d9a21b] px-4 py-3 text-base font-bold text-[#2a1c12] transition hover:bg-[#e6ae22]">
        Entendi
      </button>
    </Modal>
  );
}
