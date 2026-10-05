"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createSharedMural, deleteSharedMural, listSharedMurals, respondSharedInvite, setSharedPassword, SHARED_ERROR_TEXT, type SharedFailure, type SharedMural } from "@/lib/shared";
import { getBrowserSupabase } from "@/lib/supabase";
import { cleanNickname } from "@/lib/mural";
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
  const [changing, setChanging] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");

  const reload = useCallback(async () => {
    setList(await listSharedMurals(sb));
    onChanged();
  }, [sb, onChanged]);
  useEffect(() => {
    void listSharedMurals(sb).then(setList);
  }, [sb]);

  const fail = (r: SharedFailure) => setErr(SHARED_ERROR_TEXT[r]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const res = await createSharedMural(sb, title.trim(), partner.trim(), password);
    setBusy(false);
    if (!res.ok) return fail(res.reason);
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
      <p className="text-[#4a3826]">Um mural só de vocês dois. Quem cria define a senha, a outra pessoa aceita o convite, e só as duas contas conseguem abrir (sempre com a senha).</p>

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
              <div className="mt-3 flex flex-wrap gap-2">
                {m.status === "accepted" && (
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
            <Field label="Nome do mural">{(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Ex: Nossa viagem" className={inputClass} />}</Field>
            <Field label="Usuário da outra pessoa">
              {(id) => <input id={id} value={partner} onChange={(e) => setPartner(cleanNickname(e.target.value))} autoComplete="off" placeholder="nome-de-usuario" className={inputClass} />}
            </Field>
            <Field label="Senha do mural" hint={<span className="text-xs text-[#8a7b69]">Combine com a outra pessoa</span>}>
              {(id) => (
                <div className="relative">
                  <input id={id} type={show ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-20`} />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} className="absolute inset-y-0 right-3 cursor-pointer text-sm font-semibold text-[#6b5440] hover:text-[#2f2218]">
                    {show ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              )}
            </Field>
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
