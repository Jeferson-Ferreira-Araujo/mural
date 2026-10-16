"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteSharedMural, listSharedMurals, respondSharedInvite, setSharedPassword, SHARED_ERROR_TEXT, type SharedFailure, type SharedMural } from "@/lib/shared";
import { getBrowserSupabase } from "@/lib/supabase";
import { ghostButton, inputClass, primaryButton } from "../ui";

const iconBtn = "grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#d9c9ad] bg-white text-[#4a3826] transition hover:bg-[#efe4cf] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50";
const ic = { viewBox: "0 0 24 24", className: "size-5", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

/**
 * Murais compartilhados entre duas pessoas PINZ+: convites recebidos e a lista dos murais (nome, com quem, e os botões de senha, editar e excluir).
 * Para criar um, a pessoa vai ao perfil da outra ("Solicitar mural compartilhado").
 */
export function SharedMurals({ onChanged, onNotify }: { plus?: boolean; onChanged: () => void; onNotify: (m: string) => void }) {
  const sb = getBrowserSupabase();
  const [list, setList] = useState<SharedMural[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
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

      {err && (
        <p role="alert" className="text-sm text-[#a23b2a]">
          {err}
        </p>
      )}

      {list && mine.length === 0 && invites.length === 0 && (
        <p className="py-4 text-center text-sm text-[#6b5440]">Você ainda não tem murais compartilhados. Para criar um, abra o perfil da outra pessoa e toque em “Solicitar mural compartilhado”.</p>
      )}

      {mine.length > 0 && (
        <ul aria-label="Murais compartilhados" className="space-y-2">
          {mine.map((m) => {
            const who = m.mine ? m.partner : m.owner;
            return (
              <li key={m.id} className={card}>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {m.locked && <span aria-label="Bloqueado: os dois participantes precisam ter o PINZ+ ativo">🔒 </span>}
                      {m.title}
                    </p>
                    <p className="truncate text-sm text-[#6b5440]">
                      com @{who}
                      {m.status === "pending" ? " · aguardando aceitar" : ""}
                    </p>
                  </div>
                  {m.mine && m.status === "accepted" && (
                    <button type="button" onClick={() => setChanging(changing === m.id ? null : m.id)} aria-label={`Alterar a senha de ${m.title}`} title="Alterar senha" className={iconBtn}>
                      <svg {...ic}>
                        <circle cx="8" cy="15" r="4" />
                        <path d="m11 12 8-8M16 7l3 3M14 9l2 2" />
                      </svg>
                    </button>
                  )}
                  {m.status === "accepted" && (
                    <a href={m.locked ? undefined : `/${m.owner}/${m.slug}`} aria-disabled={m.locked} aria-label={`Editar ${m.title}`} title={m.locked ? "Bloqueado" : "Editar"} className={`${iconBtn} ${m.locked ? "pointer-events-none opacity-50" : ""}`}>
                      <svg {...ic}>
                        <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
                        <path d="m14 8 3 3" />
                      </svg>
                    </a>
                  )}
                  {m.mine && (
                    <button type="button" disabled={busy} onClick={() => void remove(m)} aria-label={`${m.status === "pending" ? "Cancelar o convite de" : "Apagar"} ${m.title}`} title={m.status === "pending" ? "Cancelar convite" : "Apagar"} className={`${iconBtn} !border-[#e3b3a8] !text-[#a23b2a] hover:!bg-[#fbeae5]`}>
                      <svg {...ic}>
                        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />
                      </svg>
                    </button>
                  )}
                </div>
                {changing === m.id && (
                  <div className="mt-3 flex gap-2">
                    <input type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Nova senha (mín. 6)" aria-label="Nova senha" className={inputClass} />
                    <button type="button" disabled={busy || newPw.length < 6} onClick={() => void savePassword(m)} className={`${primaryButton} !w-auto shrink-0 px-4`}>
                      Salvar
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
