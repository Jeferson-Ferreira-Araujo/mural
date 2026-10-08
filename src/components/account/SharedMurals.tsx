"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createSharedMural, deleteSharedMural, listSharedMurals, respondSharedInvite, setSharedPassword, SHARED_ERROR_TEXT, type SharedFailure, type SharedMural } from "@/lib/shared";
import { getBrowserSupabase } from "@/lib/supabase";
import { BOARDS, DEFAULT_BOARD } from "@/lib/boards";
import { fetchInventory, type BoardOffer } from "@/lib/badges";
import { SearchBox } from "../SearchBox";
import { Field, ghostButton, inputClass, primaryButton } from "../ui";

/** Murais compartilhados entre duas pessoas PLUS: convites recebidos, os seus murais e a criação de um novo. */
export function SharedMurals({ plus, onChanged, onNotify }: { plus: boolean; onChanged: () => void; onNotify: (m: string) => void }) {
  const sb = getBrowserSupabase();
  const [list, setList] = useState<SharedMural[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [partner, setPartner] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [board, setBoard] = useState<string>(DEFAULT_BOARD);
  const [offers, setOffers] = useState<BoardOffer[]>([]);
  const [changing, setChanging] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");

  const reload = useCallback(async () => {
    setList(await listSharedMurals(sb));
    onChanged();
  }, [sb, onChanged]);
  useEffect(() => {
    void listSharedMurals(sb).then(setList);
    void fetchInventory(sb).then((inv) => setOffers(inv?.boards ?? []));
  }, [sb]);
  const ownedBoards = BOARDS.filter((b) => b.id === DEFAULT_BOARD || offers.find((o) => o.id === b.id)?.owned === true);

  const fail = (r: SharedFailure) => setErr(SHARED_ERROR_TEXT[r]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const res = await createSharedMural(sb, title.trim(), partner.trim(), password);
    setBusy(false);
    if (!res.ok) return fail(res.reason);
    if (board !== DEFAULT_BOARD) await sb.rpc("set_mural_board", { p_mural_id: res.id, p_board: board });
    setBoard(DEFAULT_BOARD);
    setTitle("");
    setPartner("");
    setPassword("");
    onNotify("Convite enviado! O mural abre quando a outra pessoa aceitar.");
    await reload();
  }

  async function respond(m: SharedMural, accept: boolean) {
    setBusy(true);
    setErr(null);
    const res = await respondSharedInvite(sb, m.id, accept);
    setBusy(false);
    if (!res.ok) return fail(res.reason);
    onNotify(accept ? "Convite aceito! Abra o mural com a senha combinada." : "Convite recusado.");
    await reload();
  }

  async function remove(m: SharedMural) {
    if (!window.confirm(m.status === "pending" ? "Cancelar este convite?" : "Apagar este mural para as duas pessoas? Todos os pins serão perdidos.")) return;
    setBusy(true);
    const ok = await deleteSharedMural(sb, m.id);
    setBusy(false);
    if (!ok) return setErr(SHARED_ERROR_TEXT.error);
    await reload();
  }

  async function savePassword(m: SharedMural) {
    setBusy(true);
    setErr(null);
    const res = await setSharedPassword(sb, m.id, newPw);
    setBusy(false);
    if (!res.ok) return fail(res.reason);
    setChanging(null);
    setNewPw("");
    onNotify("Senha trocada. As duas pessoas precisam usar a nova.");
  }

  const invites = (list ?? []).filter((m) => !m.mine && m.status === "pending");
  const mine = (list ?? []).filter((m) => m.mine || m.status === "accepted");
  const card = "rounded-2xl border border-[#e1d3ba] bg-white/60 p-3";

  return (
    <div className="space-y-5 text-[15px]">
      <section aria-label="Como funciona" className="rounded-2xl border border-[#ecd9a0] bg-[#fff6dd] p-3.5 text-sm text-[#4a3826]">
        <p className="font-semibold text-[#2a1c12]">Como funciona</p>
        <p className="mt-1">Um mural só de vocês dois: você cria, define a senha e convida uma pessoa PLUS. Quando ela aceitar, só as duas contas conseguem abrir o mural, sempre com a senha. Os dois podem colar pins.</p>
      </section>

      {invites.length > 0 && (
        <section aria-label="Convites recebidos" className="space-y-2">
          <h3 className="font-title text-base font-semibold">Convites para você</h3>
          {invites.map((m) => (
            <div key={m.id} className={card}>
              <p className="font-bold">{m.title}</p>
              <p className="text-sm text-[#6b5440]">@{m.owner} quer compartilhar um mural com você.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={busy} onClick={() => void respond(m, false)} className={`${ghostButton} flex-1`}>
                  Recusar
                </button>
                <button type="button" disabled={busy} onClick={() => void respond(m, true)} className={`${primaryButton} flex-1`}>
                  Aceitar
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {mine.length > 0 && (
        <section aria-label="Murais compartilhados" className="space-y-2">
          <h3 className="font-title text-base font-semibold">Seus murais compartilhados</h3>
          {mine.map((m) => (
            <div key={m.id} className={card}>
              <p className="font-bold">{m.title}</p>
              <p className="text-sm text-[#6b5440]">
                com @{m.mine ? m.partner : m.owner} · {m.status === "pending" ? "aguardando a pessoa aceitar" : "ativo"}
              </p>
              {m.locked && (
                <p role="status" className="mt-2 rounded-xl border border-[#d9a21b]/50 bg-[#fff6dd] px-3 py-2 text-sm font-semibold text-[#6b4a10]">
                  🔒 Esse mural está bloqueado, necessário que todos os participantes estejam com a conta Plus ativa.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {m.status === "accepted" && !m.locked && (
                  <a href={`/${m.owner}/${m.slug}`} className={`${primaryButton} !w-auto flex-1 text-center`}>
                    Abrir
                  </a>
                )}
                {m.mine && m.status === "accepted" && (
                  <button type="button" onClick={() => setChanging(changing === m.id ? null : m.id)} className={`${ghostButton} flex-1`}>
                    Trocar senha
                  </button>
                )}
                {m.mine && (
                  <button type="button" disabled={busy} onClick={() => void remove(m)} className={`${ghostButton} flex-1 !text-[#a23b2a]`}>
                    {m.status === "pending" ? "Cancelar convite" : "Apagar"}
                  </button>
                )}
              </div>
              {changing === m.id && (
                <div className="mt-3 flex gap-2">
                  <input type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Nova senha (mín. 6)" className={inputClass} />
                  <button type="button" disabled={busy || newPw.length < 6} onClick={() => void savePassword(m)} className={`${primaryButton} !w-auto shrink-0 px-4`}>
                    Salvar
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <section aria-label="Criar mural compartilhado">
        <h3 className="font-title text-base font-semibold">Criar um mural compartilhado</h3>
        {!plus ? (
          <p className="mt-2 rounded-xl border border-[#d9c9ad] bg-white/60 px-3 py-2 text-sm text-[#4a3826]">É um recurso do PINZ PLUS: você e a outra pessoa precisam ter o plano.</p>
        ) : (
          <form onSubmit={create} noValidate className="mt-2 space-y-3">
            <fieldset className="min-w-0">
              <legend className="mb-1 text-sm font-semibold">1. Tipo do mural</legend>
              <div role="radiogroup" aria-label="Tipo do mural" className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
                {ownedBoards.map((bd) => {
                  const on = board === bd.id;
                  return (
                    <button
                      key={bd.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setBoard(bd.id)}
                      className={`relative w-[7.5rem] shrink-0 cursor-pointer snap-center rounded-xl border-2 p-1.5 text-center transition ${on ? "border-[#d9a21b] bg-[#fff6dd] shadow-[0_0.2rem_0.7rem_rgba(217,162,27,.35)] ring-2 ring-[#d9a21b]/40" : "border-[#e1d3ba] bg-white hover:bg-[#fff6dd]"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bd.image} alt="" draggable={false} className="aspect-[3/2] w-full rounded-lg object-cover" />
                      {on && <span aria-hidden className="absolute top-2.5 left-2.5 grid size-5 place-items-center rounded-full bg-[#d9a21b] text-[#2a1c12] shadow"><svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span>}
                      <span className="mt-1 block text-xs font-semibold">{bd.name}</span>
                    </button>
                  );
                })}
              </div>
              {ownedBoards.length === 1 && <p className="text-xs text-[#6b5440]">Outros tipos de mural você compra na loja.</p>}
            </fieldset>
            <Field label="2. Nome do mural">{(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Ex: Nossa viagem" className={inputClass} />}</Field>
            <Field label="3. Senha do mural" hint={<span className="text-xs text-[#8a7b69]">Combine com a outra pessoa (mínimo 6 caracteres)</span>}>
              {(id) => (
                <div className="relative">
                  <input id={id} type={show ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-20`} />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} className="absolute inset-y-0 right-3 cursor-pointer text-sm font-semibold text-[#6b5440] hover:text-[#2f2218]">
                    {show ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              )}
            </Field>
            <div>
              <p className="mb-1 text-sm font-semibold">4. Para quem enviar o convite</p>
              {partner ? (
                <p className="flex items-center justify-between gap-2 rounded-xl border border-[#e1d3ba] bg-white px-3 py-2.5 text-sm">
                  <strong>@{partner}</strong>
                  <button type="button" onClick={() => setPartner("")} className="cursor-pointer text-sm font-semibold text-[#6b5440] underline">
                    Trocar
                  </button>
                </p>
              ) : (
                <SearchBox hideLabel onSelect={(n) => setPartner(n)} />
              )}
            </div>
            {err && (
              <p role="alert" className="text-sm text-[#a23b2a]">
                {err}
              </p>
            )}
            <button type="submit" disabled={busy || !title.trim() || partner.length < 3 || password.length < 6} className={primaryButton}>
              {busy ? "Enviando…" : "Enviar convite"}
            </button>
          </form>
        )}
        {!plus && err && (
          <p role="alert" className="mt-2 text-sm text-[#a23b2a]">
            {err}
          </p>
        )}
      </section>
    </div>
  );
}
