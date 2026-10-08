"use client";

import { useEffect, useRef, useState } from "react";
import { BOARDS, DEFAULT_BOARD } from "@/lib/boards";
import { fetchInventory } from "@/lib/badges";
import { getBrowserSupabase } from "@/lib/supabase";
import { Field, inputClass, primaryButton } from "../ui";
import { Modal } from "./Modal";

/** Novo mural (PINZ PLUS): nome e tipo (fundo). Com mais de um tipo comprado, os tipos aparecem num carrossel para escolher. */
export function NewMuralModal({ open, onClose, nick }: { open: boolean; onClose: () => void; nick: string }) {
  const [title, setTitle] = useState("");
  const [board, setBoard] = useState<string>(DEFAULT_BOARD);
  const [owned, setOwned] = useState<string[]>([DEFAULT_BOARD]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picked = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setBoard(DEFAULT_BOARD);
    setError(null);
    void fetchInventory(getBrowserSupabase()).then((inv) => {
      const mine = (inv?.boards ?? []).filter((b) => b.owned).map((b) => b.id);
      setOwned(BOARDS.map((b) => b.id as string).filter((id) => id === DEFAULT_BOARD || mine.includes(id)));
    });
  }, [open]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !title.trim()) return;
    setBusy(true);
    setError(null);
    const sb = getBrowserSupabase();
    const { data, error: err } = await sb.rpc("create_mural", { p_title: title.trim(), p_question: "", p_answer: "" });
    const created = data as { slug?: string; id?: string } | null;
    if (err || !created?.slug || !created.id) {
      setBusy(false);
      setError(err?.message.includes("mural_limit") ? "Você chegou ao limite de murais." : "Não foi possível criar o mural agora. Tente de novo.");
      return;
    }
    if (board !== DEFAULT_BOARD) {
      const { error: eb } = await sb.rpc("set_mural_board", { p_mural_id: created.id, p_board: board });
      if (eb) setError("O mural foi criado, mas não deu para aplicar o tipo escolhido. Troque em Editar mural.");
    }
    window.location.assign(`/${nick}/${created.slug}`); // abre o mural novo
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo mural">
      <form onSubmit={create} className="space-y-4" noValidate>
        <Field label="Nome do mural">{(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} autoFocus placeholder="Ex: Viagem de 2026" className={inputClass} />}</Field>

        {(
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Tipo de mural</legend>
            <div role="radiogroup" aria-label="Tipo de mural" className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
              {BOARDS.map((b) => {
                const id = b.id as string;
                const has = owned.includes(id);
                const on = board === id;
                return (
                  <button
                    key={id}
                    ref={on ? picked : undefined}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-disabled={!has}
                    onClick={() => has && setBoard(id)}
                    className={`relative w-[8.5rem] shrink-0 cursor-pointer snap-center rounded-xl border-2 p-1.5 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${!has ? "cursor-default border-[#e1d3ba] bg-white/40 opacity-60" : on ? "border-[#2f2218] bg-white shadow-sm" : "border-[#e1d3ba] bg-white/60"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.image} alt="" draggable={false} className="aspect-[3/2] w-full rounded-lg object-cover" />
                    {!has && <span aria-hidden className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-black/60 text-xs">🔒</span>}
                    <span className="mt-1 block text-sm font-semibold">{b.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[#6b5440]">{owned.length > 1 ? "Os tipos com 🔒 você compra na loja." : "Seu mural será Cortiça. Os outros tipos (🔒) você compra na loja com créditos."}</p>
          </fieldset>
        )}

        {error && (
          <p role="alert" className="text-sm text-[#a23b2a]">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy || !title.trim()} className={primaryButton}>
          {busy ? "Criando…" : "Criar mural"}
        </button>
      </form>
    </Modal>
  );
}
