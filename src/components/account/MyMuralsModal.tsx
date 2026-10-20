"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { OwnMural } from "@/lib/auth";
import { boardById } from "@/lib/boards";
import { getBrowserSupabase } from "@/lib/supabase";
import { Modal } from "./Modal";
import { MuralSettings } from "./MuralSettings";
import { SuccessPopup } from "./SuccessPopup";
import { useTranslations } from "next-intl";

/**
 * Meus murais: a lista dos murais da conta. Tocar num deles abre a edição (nome, pergunta de segurança e resposta, tipo do mural),
 * com o botão de voltar para a lista.
 */
export function MyMuralsModal({ open, onClose, murals, currentId, onNewMural, onChanged, onDeleted }: { /** botão "Criar novo mural" (só quem pode criar mais um) */ onNewMural?: () => void; open: boolean; onClose: () => void; murals: OwnMural[]; /** mural aberto agora: se for apagado, sai dele */ currentId?: string; onChanged: () => void; onDeleted: () => void }) {
  const tx = useTranslations("components.account.MyMuralsModal");
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

  // muda a ordem: o primeiro da lista é o mural principal (o que abre primeiro e que não pode ser apagado)
  // arrastar para mudar a ordem: segura a alça do cartão e leva para cima ou para baixo; solta para guardar
  const [order, setOrder] = useState<string[] | null>(null); // ordem na tela durante o arraste
  const [drag, setDrag] = useState<{ id: string; grab: number; y: number } | null>(null);
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const ordered = order ? order.map((id) => murals.find((m) => m.id === id)).filter((m): m is OwnMural => !!m) : murals;

  // o cartão arrastado segue o dedo: o deslocamento compensa a posição que ele ocupa na lista a cada troca
  useLayoutEffect(() => {
    if (!drag) return;
    const el = rowRefs.current[drag.id];
    if (!el) return;
    el.style.transform = "";
    const natural = el.getBoundingClientRect().top;
    el.style.transform = `translateY(${drag.y - drag.grab - natural}px) scale(1.02)`;
  }, [drag, order]);

  function startDrag(e: React.PointerEvent, id: string) {
    if (busy || murals.length < 2 || (e.pointerType === "mouse" && e.button !== 0)) return;
    const el = rowRefs.current[id];
    if (!el) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setOrder(murals.map((m) => m.id));
    setDrag({ id, grab: e.clientY - el.getBoundingClientRect().top, y: e.clientY });
  }
  function moveDrag(e: React.PointerEvent) {
    if (!drag || !order) return;
    const y = e.clientY;
    let next = order;
    const at = order.indexOf(drag.id);
    // troca de lugar quando o cartão passa do meio do vizinho
    const mid = (id: string) => {
      const r = rowRefs.current[id]?.getBoundingClientRect();
      return r ? r.top + r.height / 2 : 0;
    };
    const center = y - drag.grab + (rowRefs.current[drag.id]?.getBoundingClientRect().height ?? 0) / 2;
    if (at > 0 && center < mid(order[at - 1])) next = order.map((id, k) => (k === at - 1 ? drag.id : k === at ? order[at - 1] : id));
    else if (at < order.length - 1 && center > mid(order[at + 1])) next = order.map((id, k) => (k === at + 1 ? drag.id : k === at ? order[at + 1] : id));
    if (next !== order) setOrder(next);
    setDrag({ ...drag, y });
  }
  async function endDrag() {
    if (!drag || !order) return;
    const el = rowRefs.current[drag.id];
    if (el) el.style.transform = "";
    const ids = order;
    const changed = ids.some((id, k) => id !== murals[k]?.id);
    setDrag(null);
    if (!changed) return setOrder(null);
    setBusy(true);
    setErr(null);
    const { error } = await getBrowserSupabase().rpc("set_mural_order", { p_ids: ids });
    setBusy(false);
    if (error) {
      setOrder(null);
      return setErr(tx("m_naoFoiPossivelMudarA"));
    }
    onChanged();
    window.setTimeout(() => setOrder(null), 400); // dá tempo de a lista nova chegar
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (busy || j < 0 || j >= murals.length) return;
    const ids = murals.map((m) => m.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setBusy(true);
    setErr(null);
    const { error } = await getBrowserSupabase().rpc("set_mural_order", { p_ids: ids });
    setBusy(false);
    if (error) return setErr(tx("m_naoFoiPossivelMudarA"));
    onChanged();
  }

  async function remove() {
    if (!toDelete || busy) return;
    setBusy(true);
    setErr(null);
    const { error } = await getBrowserSupabase().rpc("delete_mural", { p_id: toDelete.id });
    setBusy(false);
    if (error) return setErr(tx("m_naoFoiPossivelApagarAgora"));
    const wasCurrent = toDelete.id === currentId;
    setConfirmId(null);
    onChanged();
    if (wasCurrent) onDeleted(); // apagou o mural que estava aberto: vai para o principal
  }

  return (
    <>
    <Modal open={open} onClose={onClose} title={editing ? "" : "Meus murais"} label={tx("meusMurais")} wide overlay={confirmId && toDelete ? (
        <div role="alertdialog" aria-label={tx("apagarMural")} className="absolute inset-0 z-20 grid place-items-center rounded-3xl bg-[#2a1c12]/55 p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#fbf6ea] p-5 text-center shadow-[0_1rem_3rem_rgba(0,0,0,.45)]">
            <p className="font-title text-xl font-semibold">Apagar “{toDelete.title}”?</p>
            <p className="mt-2 text-sm text-[#4a3826]">{tx("osBottonsSeraoDevolvidosA")}</p>
            {err && <p role="alert" className="mt-2 text-sm text-[#a23b2a]">{err}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => (setConfirmId(null), setErr(null))} disabled={busy} className="flex-1 cursor-pointer rounded-xl border border-[#d9c9ad] bg-white px-4 py-2.5 text-sm font-semibold text-[#4a3826] hover:bg-[#efe4cf]">
                {tx("cancelar")}</button>
              <button type="button" onClick={() => void remove()} disabled={busy} className="flex-1 cursor-pointer rounded-xl bg-[#a23b2a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#8c3022] disabled:opacity-60">
                {busy ? "Apagando…" : "Apagar"}
              </button>
            </div>
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
        <p className="py-6 text-center text-sm text-[#6b5440]">{tx("voceAindaNaoCriouNenhum")}</p>
      ) : (
        <div>
          {/* discreto, no topo à direita, acima do primeiro mural */}
          {onNewMural && (
            <div className="mb-2.5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNewMural();
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#d9c9ad] bg-white/70 px-3 py-1.5 text-sm font-semibold text-[#4a3826] transition hover:bg-white active:scale-95"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Criar novo mural
              </button>
            </div>
          )}
          {err && !confirmId && (
            <p role="alert" className="mb-2 text-sm text-[#a23b2a]">
              {err}
            </p>
          )}
          <ul className="space-y-2.5">
            {ordered.map((m, i) => {
              const b = boardById(boards[m.id]);
              return (
                <li key={m.id} ref={(el) => { rowRefs.current[m.id] = el; }} className={`relative flex items-stretch gap-2 rounded-2xl border border-[#e1d3ba] bg-white/70 p-2.5 transition-colors hover:bg-white ${drag?.id === m.id ? "z-10 !bg-white shadow-[0_0.6rem_1.4rem_rgba(60,35,10,.35)]" : ""}`}>
                  {murals.length > 1 && (
                    <button
                      type="button"
                      onPointerDown={(e) => startDrag(e, m.id)}
                      onPointerMove={moveDrag}
                      onPointerUp={() => void endDrag()}
                      onPointerCancel={() => void endDrag()}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp") (e.preventDefault(), void move(i, -1));
                        if (e.key === "ArrowDown") (e.preventDefault(), void move(i, 1));
                      }}
                      aria-label={`Mudar a ordem de ${m.title}: arraste (ou use as setas do teclado)`}
                      title={tx("arrasteParaMudarAOrdem")}
                      className={`grid w-7 shrink-0 touch-none place-items-center rounded-lg pt-6 text-[#8a7b69] transition hover:bg-black/5 hover:text-[#4a3826] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${drag?.id === m.id ? "cursor-grabbing" : "cursor-grab"}`}
                    >
                      <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="currentColor">
                        <circle cx="9" cy="6" r="1.6" />
                        <circle cx="15" cy="6" r="1.6" />
                        <circle cx="9" cy="12" r="1.6" />
                        <circle cx="15" cy="12" r="1.6" />
                        <circle cx="9" cy="18" r="1.6" />
                        <circle cx="15" cy="18" r="1.6" />
                      </svg>
                    </button>
                  )}
                  {/* só a imagem do mural (com o cadeado, se tiver pergunta de segurança) e os botões de editar e apagar */}
                  <button type="button" onClick={() => setEditId(m.id)} className="relative w-44 max-w-[62%] min-w-0 shrink-0 cursor-pointer text-left" aria-label={`Editar ${m.title}${m.question ? " (com pergunta de segurança)" : ""}`} title={m.title}>
                    <span className="mb-1 block h-5 max-w-44 truncate text-sm leading-5 font-bold">{m.title}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.image} alt="" draggable={false} className="aspect-[3/2] w-full max-w-44 rounded-lg object-cover" />
                    {/* abaixo da imagem: se o mural é público ou privado (com pergunta de segurança) */}
                    <span className={`mt-1.5 flex items-center gap-1 text-xs font-semibold ${m.question ? "text-[#8a5a10]" : "text-[#2f6a3c]"}`}>
                      {m.question ? (
                        <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <rect x="5" y="11" width="14" height="9" rx="2" />
                          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <circle cx="12" cy="12" r="9" />
                          <path d="M3 12h18M12 3c2.5 2.6 3.7 5.600 3.700 9s-1.200 6.400-3.700 9c-2.500-2.600-3.700-5.600-3.700-9s1.200-6.400 3.700-9Z" />
                        </svg>
                      )}
                      {m.question ? "Privado" : tx("m_publico")}
                    </span>
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 pt-6">
                    <button type="button" onClick={() => setEditId(m.id)} aria-label={`Editar ${m.title}`} title={tx("editar")} className="grid size-10 cursor-pointer place-items-center rounded-lg bg-[#1f232b] text-white transition hover:bg-[#2c313b]">
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
                        <path d="m14 8 3 3" />
                      </svg>
                    </button>
                    {/* o principal (o primeiro mural) nunca pode ser apagado */}
                    {i > 0 && (
                      <button type="button" onClick={() => (setErr(null), setConfirmId(m.id))} aria-label={`Apagar ${m.title}`} title={tx("apagar")} className="grid size-10 cursor-pointer place-items-center rounded-lg border border-[#e3b3a8] bg-white text-[#a23b2a] transition hover:bg-[#fbeae5]">
                        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />
                        </svg>
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
    <SuccessPopup open={flash} message="Mural salvo com sucesso!" onClose={() => setFlash(false)} />
    </>
  );
}
