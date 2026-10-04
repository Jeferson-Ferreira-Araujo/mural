"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";

const key = (uid: string) => `pinz:tip:${uid}`;
const RECENT_MS = 7 * 24 * 60 * 60 * 1000;

/** Dica de boas-vindas: aparece uma vez, no primeiro acesso ao próprio mural depois de criar a conta. */
export function FirstTimeTip({ uid, createdAt, ready }: { uid?: string; createdAt?: string; /** o mural já está na tela */ ready: boolean }) {
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
    <Modal open={open} onClose={close} title="Bem-vindo ao seu mural!">
      <ul className="space-y-4 text-[15px]">
        <li className="flex gap-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1e7d2] text-xl">
            📌
          </span>
          <p>
            <strong>Colar um pin:</strong> toque (ou clique) num espaço vazio do mural para escolher o formato e escrever. Também dá para usar o botão "Deixar um PIN".
          </p>
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1e7d2] text-xl">
            🤏
          </span>
          <p>
            <strong>Zoom no celular:</strong> faça o movimento de pinça com dois dedos para aproximar ou afastar. Dar dois toques seguidos também aproxima onde você tocou, e o botão "Ver tudo" mostra o mural inteiro de novo.
          </p>
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1e7d2] text-xl">
            ✋
          </span>
          <p>
            <strong>Andar pelo mural:</strong> com o mural aproximado, arraste com o dedo para ver as outras partes.
          </p>
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1e7d2] text-xl">
            🎨
          </span>
          <p>
            <strong>Enfeitar com botons:</strong> os botons da barra de baixo podem ser arrastados e soltos onde você quiser no mural. Para tirar, arraste de volta para a barra.
          </p>
        </li>
      </ul>
      <button type="button" onClick={close} className="mt-6 w-full cursor-pointer rounded-xl bg-[#d9a21b] px-4 py-3 text-base font-bold text-[#2a1c12] transition hover:bg-[#e6ae22]">
        Entendi
      </button>
    </Modal>
  );
}
