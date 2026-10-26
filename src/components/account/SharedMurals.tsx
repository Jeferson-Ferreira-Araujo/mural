"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteSharedMural, listSharedMurals, respondSharedInvite, setSharedPrivacy, SHARED_ERROR_TEXT, type SharedFailure, type SharedMural } from "@/lib/shared";
import { getBrowserSupabase } from "@/lib/supabase";
import { ghostButton, primaryButton } from "../ui";
import { PrivacyField, privacyError, type Privacy } from "./PrivacyField";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

const iconBtn = "grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#d9c9ad] bg-white text-[#4a3826] transition hover:bg-[#efe4cf] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50";
const ic = { viewBox: "0 0 24 24", className: "size-5", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

/**
 * Murais compartilhados entre duas pessoas PINZ+: convites recebidos e a lista dos murais (nome, com quem, e os botões de senha e excluir).
 * Para criar um, a pessoa vai ao perfil da outra ("Solicitar mural compartilhado").
 */
export function SharedMurals({ onChanged, onNotify }: { plus?: boolean; onChanged: () => void; onNotify: (m: string) => void }) {
  const tl = useLit();
  const tx = useTranslations("components.account.SharedMurals");
  const sb = getBrowserSupabase();
  const [list, setList] = useState<SharedMural[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [changing, setChanging] = useState<string | null>(null);
  const [pv, setPv] = useState<Privacy>({ priv: true, question: "", answer: "" }); // nova pergunta de segurança (ou mural sem pergunta)
  const [confirmId, setConfirmId] = useState<string | null>(null); // mural que a pessoa quer apagar: pede confirmação aqui mesmo, no site

  const reload = useCallback(async () => {
    setList(await listSharedMurals(sb));
    onChanged();
  }, [sb, onChanged]);
  useEffect(() => {
    void listSharedMurals(sb).then(setList);
  }, [sb]);

  const fail = (r: SharedFailure) => setErr(tl(SHARED_ERROR_TEXT[r]));

  async function respond(m: SharedMural, accept: boolean) {
    setBusy(true);
    setErr(null);
    const res = await respondSharedInvite(sb, m.id, accept);
    setBusy(false);
    if (!res.ok) return fail(res.reason);
    onNotify(accept ? tx("m_conviteAceitoAbraOMural") : tl("Convite recusado."));
    await reload();
  }

  async function remove(m: SharedMural) {
    setBusy(true);
    const ok = await deleteSharedMural(sb, m.id);
    setBusy(false);
    setConfirmId(null);
    if (!ok) return setErr(tl(SHARED_ERROR_TEXT.error));
    await reload();
  }

  async function savePrivacy(m: SharedMural) {
    const perr = privacyError(pv, false);
    if (perr) return setErr(tl(perr));
    setBusy(true);
    setErr(null);
    const res = await setSharedPrivacy(sb, m.id, { priv: pv.priv, question: pv.question.trim(), answer: pv.answer.trim() });
    setBusy(false);
    if (!res.ok) return fail(res.reason);
    setChanging(null);
    setPv({ priv: true, question: "", answer: "" });
    onNotify(tl("Pergunta de segurança atualizada. As duas pessoas entram de novo com a resposta nova."));
  }

  const invites = (list ?? []).filter((m) => !m.mine && m.status === "pending");
  const mine = (list ?? []).filter((m) => m.mine || m.status === "accepted");
  const card = "rounded-2xl border border-[#e1d3ba] bg-white/60 p-3";

  return (
    <div className="space-y-5 text-[15px]">
      {invites.length > 0 && (
        <section aria-label={tx("convitesRecebidos")} className="space-y-2">
          <h3 className="font-title text-base font-semibold">{tx("convitesParaVoce")}</h3>
          {invites.map((m) => (
            <div key={m.id} className={card}>
              <p className="font-bold">{m.title}</p>
              <p className="text-sm text-[#6b5440]">{tx("x_querCompartilharUmMuralCom", { v0: m.owner })}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={busy} onClick={() => void respond(m, false)} className={`${ghostButton} flex-1`}>
                  {tx("recusar")}</button>
                <button type="button" disabled={busy} onClick={() => void respond(m, true)} className={`${primaryButton} flex-1`}>
                  {tx("aceitar")}</button>
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
        <p className="py-4 text-center text-sm text-[#6b5440]">{tx("voceAindaNaoTemMurais")}</p>
      )}

      {mine.length > 0 && (
        <ul aria-label={tx("muraisCompartilhados")} className="space-y-2">
          {mine.map((m) => {
            const who = m.mine ? m.partner : m.owner;
            return (
              <li key={m.id} className={card}>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {m.locked && <span aria-label={tx("bloqueadoOsDoisParticipantesPrecisam")}>🔒 </span>}
                      {m.title}
                    </p>
                    <p className="truncate text-sm text-[#6b5440]">
                      {tx("x_com", { v0: who, pending: m.status === "pending" ? "yes" : "no" })}
                    </p>
                  </div>
                  {m.mine && m.status === "accepted" && (
                    <button type="button" onClick={() => setChanging(changing === m.id ? null : m.id)} aria-label={`${tl("Alterar a pergunta de segurança")}: ${m.title}`} title={tl("Alterar a pergunta de segurança")} className={iconBtn}>
                      <svg {...ic}>
                        <circle cx="8" cy="15" r="4" />
                        <path d="m11 12 8-8M16 7l3 3M14 9l2 2" />
                      </svg>
                    </button>
                  )}
                  {m.status === "accepted" && (
                    <a href={m.locked ? undefined : `/${m.owner}/${m.slug}`} aria-disabled={m.locked} aria-label={`Visualizar ${m.title}`} title={m.locked ? tl("Bloqueado: os dois precisam ter o PINZ+") : tx("m_visualizarOMural")} className={`${iconBtn} ${m.locked ? "pointer-events-none opacity-50" : ""}`}>
                      <svg {...ic}>
                        <path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </a>
                  )}
                  {m.mine && (
                    <button type="button" disabled={busy} onClick={() => (setErr(null), setConfirmId(m.id))} aria-label={`${m.status === "pending" ? tl("Cancelar o convite de") : tl("Apagar")} ${m.title}`} title={m.status === "pending" ? tl("Cancelar convite") : tl("Apagar")} className={`${iconBtn} !border-[#e3b3a8] !text-[#a23b2a] hover:!bg-[#fbeae5]`}>
                      <svg {...ic}>
                        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />
                      </svg>
                    </button>
                  )}
                </div>
                {confirmId === m.id && (
                  <div role="alertdialog" aria-label={m.status === "pending" ? tl("Cancelar convite") : tx("m_apagarMural")} className="mt-3 rounded-xl border border-[#e3b3a8] bg-[#fbeae5] p-3">
                    <p className="text-sm font-semibold text-[#6b2a1d]">{m.status === "pending" ? tx("m_cancelarEsteConvite") : tx("m_apagarParaAsDuasPessoas", { v0: m.title })}</p>
                    {m.status !== "pending" && <p className="mt-1 text-sm text-[#6b2a1d]">{tx("todosOsPinsSeraoPerdidos")}</p>}
                    <div className="mt-3 flex gap-2">
                      <button type="button" disabled={busy} onClick={() => setConfirmId(null)} className={`${ghostButton} flex-1`}>
                        {tx("voltar")}</button>
                      <button type="button" disabled={busy} onClick={() => void remove(m)} className="flex-1 cursor-pointer rounded-xl bg-[#a23b2a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#8c3022] disabled:opacity-60">
                        {busy ? tl("Apagando…") : m.status === "pending" ? tl("Cancelar convite") : tl("Apagar")}
                      </button>
                    </div>
                  </div>
                )}
                {changing === m.id && (
                  <div className="mt-3 space-y-3">
                    <PrivacyField value={pv} onChange={setPv} />
                    <button type="button" disabled={busy} onClick={() => void savePrivacy(m)} className={primaryButton}>
                      {tx("salvar")}</button>
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
