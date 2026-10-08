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
export function MyMuralsModal({ open, onClose, murals, currentId, onChanged, onDeleted }: { open: boolean; onClose: () => void; murals: OwnMural[]; /** mural aberto agora: se for apagado, sai dele */ currentId?: string; onChanged: () => void; onDeleted: () => void }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [boards, setBoards] = useState<Record<string, string>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null); // mural que a pessoa quer apagar (pede confirmação)
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState(false); // "salvo com sucesso" por cima da janela

  // ao abrir: volta para a lista e lê o tipo (fundo) de cada mural
  useEffect(() => {
    if (!open) return;
    setEditId(null);
    setFlash(false);
    setConfirmId(null);
    setErr(null);
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
  const toDelete = murals.find((m) => m.id === confirmId) ?? null;

  async function remove() {
    if (!toDelete || busy) return;
    setBusy(true);
    setErr(null);
    const { error } = await getBrowserSupabase().rpc("delete_mural", { p_id: toDelete.id });
    setBusy(false);
    if (error) return setErr("Não foi possível apagar agora. Tente de novo.");
    const wasCurrent = toDelete.id === currentId;
    setConfirmId(null);
    onChanged();
    if (wasCurrent) onDeleted(); // apagou o mural que estava aberto: vai para o principal
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "" : "Meus murais"} label="Meus murais" wide overlay={confirmId && toDelete ? (
        <div role="alertdialog" aria-label="Apagar mural" className="absolute inset-0 z-20 grid place-items-center rounded-3xl bg-[#2a1c12]/55 p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#fbf6ea] p-5 text-center shadow-[0_1rem_3rem_rgba(0,0,0,.45)]">
            <p className="font-title text-xl font-semibold">Apagar “{toDelete.title}”?</p>
            <p className="mt-2 text-sm text-[#4a3826]">Os pins, os bottons e os acessos deste mural serão apagados. Isso não pode ser desfeito.</p>
            {err && <p role="alert" className="mt-2 text-sm text-[#a23b2a]">{err}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => (setConfirmId(null), setErr(null))} disabled={busy} className="flex-1 cursor-pointer rounded-xl border border-[#d9c9ad] bg-white px-4 py-2.5 text-sm font-semibold text-[#4a3826] hover:bg-[#efe4cf]">
                Cancelar
              </button>
              <button type="button" onClick={() => void remove()} disabled={busy} className="flex-1 cursor-pointer rounded-xl bg-[#a23b2a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#8c3022] disabled:opacity-60">
                {busy ? "Apagando…" : "Apagar"}
              </button>
            </div>
          </div>
        </div>
      ) : flash ? (
        <div role="status" className="absolute inset-0 z-20 grid place-items-center rounded-3xl bg-[#fbf6ea]/95 backdrop-blur-sm">
          <div className="text-center" style={{ animation: "buy-pop 0.5s ease" }}>
            <span className="mx-auto grid size-20 place-items-center rounded-full bg-[#3aa655] text-white shadow-[0_0.5rem_1.6rem_rgba(58,166,85,.5)]">
              <svg viewBox="0 0 24 24" className="size-11" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            </span>
            <p className="font-title mt-4 text-2xl font-semibold text-[#1f4d2b]">Mural salvo com sucesso!</p>
          </div>
        </div>
      ) : undefined} headerLeft={editing ? (<button type="button" onClick={() => setEditId(null)} className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-[#4a3826] hover:text-[#2a1c12]">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 5-7 7 7 7" />
            </svg>
            Voltar para Meus murais
          </button>) : undefined}>
      {editing ? (
        <div className="space-y-4">
          <MuralSettings
            mural={editing}
            canDelete={editing.id !== murals[0]?.id}
            onSaved={() => {
              onChanged();
              setFlash(true);
              window.setTimeout(() => {
                setFlash(false);
                setEditId(null); // volta para a lista, já com o mural alterado
              }, 1700);
            }}
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
                <li key={m.id} className="flex items-stretch gap-2 rounded-2xl border border-[#e1d3ba] bg-white/70 p-2.5 transition hover:bg-white">
                  <button type="button" onClick={() => setEditId(m.id)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left" aria-label={`Editar ${m.title}`}>
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
                  </button>
                  <div className="flex shrink-0 flex-col justify-center gap-1.5">
                    <button type="button" onClick={() => setEditId(m.id)} className="cursor-pointer rounded-lg bg-[#1f232b] px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2c313b]">
                      Editar
                    </button>
                    {/* o principal (o primeiro mural) nunca pode ser apagado */}
                    {i > 0 && (
                      <button type="button" onClick={() => (setErr(null), setConfirmId(m.id))} className="cursor-pointer rounded-lg border border-[#e3b3a8] bg-white px-3.5 py-1.5 text-sm font-semibold text-[#a23b2a] transition hover:bg-[#fbeae5]">
                        Apagar
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Modal>
  );
}
