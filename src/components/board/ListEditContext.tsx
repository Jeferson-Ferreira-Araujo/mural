"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ghostButton, inputClass, primaryButton } from "../ui";

export type ListData = { id: string; title: string; items: { text: string; done: boolean }[] };

/** Quem pode editar uma lista (dono do mural ou quem criou o pin) recebe `edit`; os outros não têm provider. */
const Ctx = createContext<((l: ListData) => void) | null>(null);
export const useListEdit = () => useContext(Ctx);
/** Marcar/desmarcar um item da lista (mesma regra de quem pode editar). */
const ToggleCtx = createContext<((id: string, index: number) => void) | null>(null);
export const useListToggle = () => useContext(ToggleCtx);

const MAX_ITEMS = 6;

function Editor({ list, onSave, onClose }: { list: ListData; onSave: (l: ListData) => Promise<boolean>; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(list.title);
  const [items, setItems] = useState(list.items.map((i) => ({ ...i })));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const filled = items.filter((i) => i.text.trim());
  const canSave = !busy && !!title.trim() && filled.length > 0;

  async function save() {
    setBusy(true);
    setErr(false);
    const ok = await onSave({ id: list.id, title: title.trim(), items: filled.map((i) => ({ text: i.text.trim(), done: i.done })) });
    setBusy(false);
    if (ok) onClose();
    else setErr(true);
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label="Editar lista"
      className="m-auto max-h-[92dvh] w-[min(94vw,30rem)] overflow-y-auto rounded-3xl border border-[#e6d8bd] bg-[#fbf6ea] p-5 text-[#2f2218] shadow-[0_2rem_5rem_rgba(0,0,0,.55)] backdrop:bg-black/60"
    >
      <h3 className="font-title text-lg font-semibold">Editar lista</h3>
      <label className="mt-4 block text-sm font-semibold">
        Título
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={32} className={`${inputClass} mt-1.5 font-normal`} />
      </label>
      <fieldset className="mt-4">
        <legend className="mb-1.5 text-sm font-semibold">Itens (até {MAX_ITEMS})</legend>
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={it.done}
                aria-label={`Item ${i + 1} feito`}
                onChange={(e) => setItems((arr) => arr.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))}
                className="size-5 shrink-0 cursor-pointer accent-[#2a2a33]"
              />
              <input value={it.text} onChange={(e) => setItems((arr) => arr.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} maxLength={40} aria-label={`Item ${i + 1}`} className={inputClass} />
              <button type="button" aria-label={`Remover item ${i + 1}`} onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))} className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-xl text-[#6b5440] hover:bg-[#efe4cf]">
                ×
              </button>
            </li>
          ))}
        </ul>
        {items.length < MAX_ITEMS && (
          <button type="button" onClick={() => setItems((arr) => [...arr, { text: "", done: false }])} className="mt-2 cursor-pointer text-sm font-semibold text-[#6b5440] underline">
            + Adicionar item
          </button>
        )}
      </fieldset>
      {err && (
        <p role="alert" className="mt-3 text-sm text-[#a23b2a]">
          Não foi possível salvar agora. Tente de novo.
        </p>
      )}
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onClose} className={`${ghostButton} flex-1`}>
          Cancelar
        </button>
        <button type="button" disabled={!canSave} onClick={() => void save()} className={`${primaryButton} flex-1`}>
          {busy ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </dialog>
  );
}

/** Envolve o mural: guarda qual lista está sendo editada e mostra o editor. `onSave` devolve true se salvou. */
export function ListEditProvider({ onSave, onToggle, children }: { onSave: (l: ListData) => Promise<boolean>; onToggle?: (id: string, index: number) => void; children: ReactNode }) {
  const [list, setList] = useState<ListData | null>(null);
  const edit = useCallback((l: ListData) => setList(l), []);
  const value = useMemo(() => edit, [edit]);
  return (
    <Ctx.Provider value={value}>
      <ToggleCtx.Provider value={onToggle ?? null}>
        {children}
        {list && <Editor key={list.id} list={list} onSave={onSave} onClose={() => setList(null)} />}
      </ToggleCtx.Provider>
    </Ctx.Provider>
  );
}
