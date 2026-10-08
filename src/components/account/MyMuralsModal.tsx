"use client";

import { useEffect, useState } from "react";
import type { OwnMural } from "@/lib/auth";
import { boardById } from "@/lib/boards";
import { getBrowserSupabase } from "@/lib/supabase";
import { Modal } from "./Modal";
import { MuralSettings } from "./MuralSettings";

/**
 * Meus murais: a lista dos murais da conta. Tocar num deles abre a edição (nome, pergunta de segurança e resposta, tipo do mural),
 * com o botão de voltar para a lista.
 */
export function MyMuralsModal({ open, onClose, murals, onChanged, onDeleted }: { open: boolean; onClose: () => void; murals: OwnMural[]; onChanged: () => void; onDeleted: () => void }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [boards, setBoards] = useState<Record<string, string>>({});

  // ao abrir: volta para a lista e lê o tipo (fundo) de cada mural
  useEffect(() => {
    if (!open) return;
    setEditId(null);
  }, [open]);
  useEffect(() => {
    if (!open || murals.length === 0) return;
    void getBrowserSupabase()
      .from("murals")
      .select("id, board")
      .in("id", murals.map((m) => m.id))
      .then(({ data }) => setBoards(Object.fromEntries(((data as { id: string; board: string }[] | null) ?? []).map((r) => [r.id, r.board]))));
  }, [open, murals]);

  const editing = murals.find((m) => m.id === editId) ?? null;

  return (
    <Modal open={open} onClose={onClose} title={editing ? "" : "Meus murais"} label="Meus murais" wide>
      {editing ? (
        <div className="space-y-4">
          <button type="button" onClick={() => setEditId(null)} className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-[#6b5440] hover:text-[#2a1c12]">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 5-7 7 7 7" />
            </svg>
            Voltar para Meus murais
          </button>
          <h3 className="font-title text-xl font-semibold">{editing.title}</h3>
          <MuralSettings
            mural={editing}
            canDelete={editing.id !== murals[0]?.id}
            onSaved={onChanged}
            onDeleted={() => {
              setEditId(null);
              onDeleted();
            }}
          />
        </div>
      ) : murals.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#6b5440]">Você ainda não criou nenhum mural.</p>
      ) : (
        <div>
          <p className="mb-3 text-sm text-[#6b5440]">Toque num mural para mudar o nome, a pergunta de segurança ou o tipo dele.</p>
          <ul className="space-y-2.5">
            {murals.map((m, i) => {
              const b = boardById(boards[m.id]);
              return (
                <li key={m.id}>
                  <button type="button" onClick={() => setEditId(m.id)} className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-[#e1d3ba] bg-white/70 p-2.5 text-left transition hover:bg-white active:scale-[0.99]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.image} alt="" draggable={false} className="aspect-[3/2] w-24 shrink-0 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-base font-bold">{m.title}</span>
                        {i === 0 && <span className="shrink-0 rounded-full bg-[#e3f3e7] px-2 py-0.5 text-[11px] font-bold text-[#2f6a3c]">Principal</span>}
                      </span>
                      <span className="mt-0.5 block text-sm text-[#6b5440]">Tipo: {b.name}</span>
                      <span className="block text-sm text-[#6b5440]">{m.question ? "🔒 Com pergunta de segurança" : "🌐 Público (sem pergunta)"}</span>
                    </span>
                    <span className="shrink-0 rounded-lg bg-[#1f232b] px-3 py-1.5 text-sm font-semibold text-white">Editar</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Modal>
  );
}
